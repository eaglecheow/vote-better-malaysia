import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'vite';
import { applicationFingerprint } from './application-fingerprint.ts';
import { validateShellManifest } from '../worker/service-worker.ts';

export interface ShellManifest { base: string; version: string; assets: string[] }
export interface BuildWorkerOptions { projectRoot: string; outDir: string; base: string }

/** Enumerates regular deployed shell files, rejecting private/escaped output rather than shipping it.
 * @param root Actual production output directory.
 * @param prefix Canonical relative traversal path.
 * @param paths Local list of nondata, nongenerated shell files.
 * @returns Completion after read-only enumeration.
 * @throws On private, symbolic or nonregular output.
 * @remarks Appends local paths; data is excluded from shell caching, not asserted source-valid.
 */
async function shellFiles(root: string, prefix: string, paths: string[]): Promise<void> {
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? prefix + '/' + entry.name : entry.name; if (path === 'data') continue;
    if (entry.name.startsWith('.') || path === 'evidence' || /^(candidate|fixtures|report|.*receipt.*|performance.*|documentation-review)\.json$/.test(entry.name))
      throw new Error('Private metadata in deployed output: ' + path);
    if (entry.isSymbolicLink()) throw new Error('Symbolic shell output: ' + path);
    if (entry.isDirectory()) await shellFiles(root, path, paths);
    else { if (!entry.isFile()) throw new Error('Nonregular shell output: ' + path); if (path !== 'sw.js') paths.push(path); }
  }
}
/** Removes only the builder's generated output stamp, leaving source templates untouched.
 * @param html Actual emitted index bytes as UTF-8 text.
 * @returns Identical index text without previously generated version metadata.
 */
function withoutStamp(html: string): string { return html.replace(/<meta\s+name=["']hansard-shell-version["']\s+content=["'][a-f0-9]{64}["']\s*\/?\s*>\n?/g, ''); }
/** Checks actual required PNG headers, dimensions and complete terminal chunk.
 * @param bytes Actual installed icon bytes.
 * @param size Required native width and height.
 * @returns Nothing after the bounded image header checks.
 * @throws On wrong signature/dimensions or truncated PNG structure.
 */
function checkPng(bytes: Buffer, size: number): void {
  if (bytes.length < 45 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.toString('ascii', 12, 16) !== 'IHDR'
    || bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size
    || bytes.toString('ascii', bytes.length - 8, bytes.length - 4) !== 'IEND') throw new Error('Invalid required PNG/dimensions');
}
/** Generates the complete versioned shell, output stamp and bundled classic native worker.
 * @param options Repository source, production output and canonical repository base.
 * @returns Sorted complete base-scoped shell metadata.
 * @throws On invalid source/output/install metadata, exceeded icon budget or bundling failure.
 * @remarks Validates before replacing generated worker/index; hashes shared application inputs and every nondata shell byte without self-generated circularity.
 */
export async function buildWorker(options: BuildWorkerOptions): Promise<ShellManifest> {
  const stats = await lstat(options.outDir); if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error('Regular shell output directory required');
  const paths: string[] = []; await shellFiles(options.outDir, '', paths); paths.sort();
  const assets = [options.base, options.base + 'sw.js']; for (const path of paths) assets.push(options.base + path); assets.sort();
  const shell: ShellManifest = { base: options.base, version: '0'.repeat(64), assets }; validateShellManifest(shell);
  const metadata = JSON.parse(await readFile(join(options.outDir, 'manifest.webmanifest'), 'utf8'));
  for (const field of ['id', 'start_url', 'scope']) if (metadata[field] !== options.base) throw new Error('Manifest must use the exact repository base');
  let iconBytes = 0;
  for (const path of paths) if (path.startsWith('icons/')) iconBytes += (await lstat(join(options.outDir, path))).size;
  if (iconBytes > 61440) throw new Error('Combined install icons exceed 61440 bytes');
  for (const size of [192, 512]) {
    let declared = false;
    if (Array.isArray(metadata.icons)) for (const icon of metadata.icons) if (icon.src === options.base + `icons/icon-${size}.png`
      && icon.sizes === `${size}x${size}` && icon.type === 'image/png') declared = true;
    if (!declared) throw new Error('Required exact PNG icon declaration missing');
    checkPng(await readFile(join(options.outDir, `icons/icon-${size}.png`)), size);
  }
  const files: Array<[string, number, string]> = []; let index = '';
  for (const path of paths) {
    let bytes = await readFile(join(options.outDir, path)); if (path === 'index.html') { index = withoutStamp(bytes.toString('utf8')); bytes = Buffer.from(index); }
    files.push([path, bytes.length, createHash('sha256').update(bytes).digest('hex')]);
  }
  shell.version = createHash('sha256').update(JSON.stringify([await applicationFingerprint(options.projectRoot), files])).digest('hex');
  const bundled = await build({ root: options.projectRoot, configFile: false, logLevel: 'silent',
    define: { __HANSARD_SHELL__: JSON.stringify(shell) }, build: { write: false, emptyOutDir: false, sourcemap: false,
      lib: { entry: join(options.projectRoot, 'worker/service-worker.ts'), name: 'HansardWorker', formats: ['iife'], fileName: 'sw' } } });
  const bundle = Array.isArray(bundled) ? bundled[0] : bundled; let worker: string | undefined;
  if ('output' in bundle) for (const output of bundle.output) if (output.type === 'chunk') worker = output.code;
  if (!worker) throw new Error('Classic worker generation produced no code');
  const stamped = index.replace(/<\/head>/i, `<meta name="hansard-shell-version" content="${shell.version}">\n</head>`);
  await writeFile(join(options.outDir, 'sw.js'), worker); await writeFile(join(options.outDir, 'index.html'), stamped);
  return shell;
}
