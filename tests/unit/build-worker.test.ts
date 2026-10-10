import { expect, test, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { deflateSync } from 'node:zlib';
import { Script } from 'node:vm';
import ts from 'typescript';
import { buildWorker, type BuildWorkerOptions } from '../../scripts/build-worker.ts';
import viteConfig from '../../vite.config.ts';

const base = '/vote-better-malaysia/';
interface BuildFixture extends BuildWorkerOptions { root: string }

/** Computes the standard PNG CRC for a fixture chunk.
 * @param bytes Chunk type and payload bytes.
 * @returns Unsigned CRC-32.
 */
function crc(bytes: Buffer): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte; for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
/** Creates one correctly length/CRC encoded PNG chunk.
 * @param name Four-character chunk type.
 * @param data Chunk payload.
 * @returns Complete PNG chunk bytes.
 */
function chunk(name: string, data: Buffer): Buffer {
  const result = Buffer.alloc(data.length + 12); result.writeUInt32BE(data.length, 0);
  result.write(name, 4, 'ascii'); data.copy(result, 8); result.writeUInt32BE(crc(result.subarray(4, data.length + 8)), data.length + 8); return result;
}
/** Creates a valid solid RGBA PNG for build validation, with optional valid ancillary padding.
 * @param width Declared and actual pixel width.
 * @param height Declared and actual pixel height.
 * @param padding Ancillary text payload length.
 * @returns Complete valid PNG; no production icon artwork is created.
 */
function png(width: number, height: number, padding = 0): Buffer {
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = y * (width * 4 + 1) + 1 + x * 4; pixels[offset] = 30; pixels[offset + 1] = 90; pixels[offset + 2] = 180; pixels[offset + 3] = 255;
  }
  const parts = [Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header)];
  if (padding > 0) parts.push(chunk('tEXt', Buffer.concat([Buffer.from('Fixture\0'), Buffer.alloc(padding, 65)])));
  parts.push(chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))); return Buffer.concat(parts);
}
/** Writes an isolated fixture file with its parent directories.
 * @param root Temporary project/output root.
 * @param path Relative fixture path.
 * @param bytes Exact fixture bytes or UTF-8 text.
 * @remarks Creates/replaces only temporary fixture files.
 */
function put(root: string, path: string, bytes: Buffer | string): void { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); }
/** Creates an isolated synthetic app build with real PNGs and no source-data claims.
 * @returns Temporary repository/output roots and canonical repository base.
 * @remarks Creates temporary source/build fixtures; never changes the actual build or icons.
 */
function fixture(): BuildFixture {
  const root = mkdtempSync(join(tmpdir(), 'hansard-worker-build-')); const projectRoot = join(root, 'project'); const outDir = join(projectRoot, 'dist');
  const sources: Record<string, string> = { 'src/main.ts': 'export const reader = 1;', 'src/source.ts': 'export const schema = 1;',
    'src/messages.ts': 'export const language = "ms";', 'src/styles.css': 'body { color: black; }',
    'worker/service-worker.ts': 'declare const __HANSARD_SHELL__: unknown;\n/** Fixture-only manifest reference. */\nconsole.log(__HANSARD_SHELL__); export {};',
    'scripts/build-worker.ts': 'export {};', 'vite.config.ts': 'export default {};',
    'package.json': '{"type":"module","devDependencies":{"vite":"8.3.4"}}', 'package-lock.json': '{"lockfileVersion":3}' };
  for (const [path, content] of Object.entries(sources)) put(projectRoot, path, content);
  put(outDir, 'index.html', `<!doctype html><html lang="ms"><head><link rel="manifest" href="${base}manifest.webmanifest"><title>Fixture reader</title></head><body><script type="module" src="${base}assets/main-A1B2C3D4.js"></script></body></html>`);
  put(outDir, 'help.html', '<!doctype html><html><body><h1>BM and English fixture guide</h1></body></html>');
  put(outDir, 'assets/main-A1B2C3D4.js', 'console.log("controlled fixture");'); put(outDir, 'assets/main-A1B2C3D4.css', 'body { color: black; }');
  put(outDir, 'manifest.webmanifest', JSON.stringify({ id: base, name: 'Fixture Hansard', short_name: 'Hansard', lang: 'ms', display: 'standalone', start_url: base, scope: base,
    icons: [{ src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' }, { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' }] }));
  put(outDir, 'icons/icon-192.png', png(192, 192)); put(outDir, 'icons/icon-512.png', png(512, 512));
  put(outDir, 'data/catalogue.json.gz', 'data fixture intentionally not part of shell'); put(outDir, 'data/sittings/1.json.gz', 'not a source-verified record');
  return { root, projectRoot, outDir, base };
}
/** Runs assertions in an isolated synthetic build and removes all temporary files.
 * @param action Controlled fixture assertions.
 * @returns Resolves after assertions and cleanup.
 * @remarks Creates/removes only this temporary fixture project.
 */
async function withFixture(action: (context: BuildFixture) => Promise<void>): Promise<void> {
  const context = fixture(); try { await action(context); } finally { rmSync(context.root, { recursive: true, force: true }); }
}
/** Reads and rewrites only temporary manifest metadata.
 * @param context Isolated build fixture.
 * @param update Controlled invalid-field mutation.
 * @remarks Replaces the temporary manifest; no actual manifest exists/changes in this task.
 */
function changeManifest(context: BuildFixture, update: (manifest: any) => void): void {
  const path = join(context.outDir, 'manifest.webmanifest'); const manifest = JSON.parse(readFileSync(path, 'utf8')); update(manifest); writeFileSync(path, JSON.stringify(manifest));
}
/** Checks actual generated syntax rather than matching dependency words inside comments/strings.
 * @param worker Generated classic worker text.
 * @remarks Parses the generated syntax and asserts dependencies are bundled without dynamic import/require.
 */
function assertClassic(worker: string): void {
  expect(new Script(worker)).toBeDefined(); const parsed = ts.createSourceFile('sw.js', worker, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
  /** Rejects runtime module/dependency calls inside generated worker code.
   * @param node Current syntax node.
   */
  function visit(node: ts.Node): void {
    expect(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)).toBe(false);
    if (ts.isCallExpression(node)) expect(node.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(node.expression) && node.expression.text === 'require')).toBe(false);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
}

test('B001 emits a versioned complete base-scoped shell and classic single-file worker',
  /** Verifies generated artifacts and URLs rather than a bundler's implementation details.
   * @returns Resolves after temporary build assertions.
   */
  async function completeBuild() { await withFixture(
    /** Checks required observable build output.
     * @param context Isolated source/build fixture.
     * @returns Resolves after generated-output checks.
     */
    async function check(context) {
      const manifest = await buildWorker(context); expect(manifest).toBeDefined(); expect(manifest.base).toBe(base); expect(manifest.version).toMatch(/^[a-f0-9]{64}$/);
      for (const path of ['', 'index.html', 'help.html', 'assets/main-A1B2C3D4.js', 'assets/main-A1B2C3D4.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'sw.js']) expect(manifest.assets).toContain(`${base}${path}`);
      expect(manifest.assets.length).toBe(new Set(manifest.assets).size); expect(manifest.assets).toEqual([...manifest.assets].sort());
      for (const url of manifest.assets) expect(url.startsWith(base) && !url.includes('/data/')).toBe(true);
      const worker = readFileSync(join(context.outDir, 'sw.js'), 'utf8'); expect(worker).toContain(manifest.version); assertClassic(worker);
      const index = readFileSync(join(context.outDir, 'index.html'), 'utf8');
      expect(index).toContain(`name="hansard-shell-version"`); expect(index).toContain(manifest.version); expect(index).toContain('Fixture reader');
    }); });

test('B002 repeat generation excludes its own index stamp and generated worker bytes',
  /** Verifies identical inputs produce the same descriptor and bytes on repeated builds.
   * @returns Resolves after deterministic-repeat checks.
   */
  async function deterministicRepeat() { await withFixture(
    /** Checks the self-stamp/self-worker circularity boundary.
     * @param context Isolated build fixture.
     * @returns Resolves after repeated generation checks.
     */
    async function check(context) {
      const first = await buildWorker(context); expect(first).toBeDefined(); const oldWorker = readFileSync(join(context.outDir, 'sw.js')); const oldIndex = readFileSync(join(context.outDir, 'index.html'));
      const second = await buildWorker(context); expect(second).toEqual(first);
      expect(readFileSync(join(context.outDir, 'sw.js'))).toEqual(oldWorker); expect(readFileSync(join(context.outDir, 'index.html'))).toEqual(oldIndex);
    }); });
for (const path of ['src/main.ts', 'src/source.ts', 'src/messages.ts', 'src/styles.css', 'worker/service-worker.ts', 'scripts/build-worker.ts', 'vite.config.ts', 'package-lock.json']) test(`B003 application input ${path} changes shell version`,
  /** Verifies application/worker/builder/config/tool inputs invalidate the shell.
   * @returns Resolves after one controlled source change.
   */
  async function sourceVersion() { await withFixture(
    /** Changes a temporary source input and checks version invalidation.
     * @param context Isolated build fixture.
     * @returns Resolves after version comparison.
     * @remarks Replaces one fixture application input.
     */
    async function check(context) { const before = await buildWorker(context); expect(before).toBeDefined();
      const file = join(context.projectRoot, path); const prior = readFileSync(file, 'utf8');
      writeFileSync(file, path.endsWith('.json') ? JSON.stringify({ ...JSON.parse(prior), fixtureChanged: true }) : `${prior}\n/* changed fixture input */\n`);
      expect((await buildWorker(context)).version).not.toBe(before.version);
    }); });
for (const path of ['index.html', 'help.html', 'assets/main-A1B2C3D4.js', 'assets/main-A1B2C3D4.css']) test(`B004 shell byte ${path} changes version`,
  /** Verifies every required shell body's bytes affect compatibility.
   * @returns Resolves after one controlled deployed-file change.
   */
  async function shellVersion() { await withFixture(
    /** Changes one nondata deployed file.
     * @param context Isolated output fixture.
     * @returns Resolves after invalidation checks.
     * @remarks Replaces only a temporary deployed shell body.
     */
    async function check(context) { const before = await buildWorker(context); expect(before).toBeDefined(); const file = join(context.outDir, path);
      writeFileSync(file, `${readFileSync(file, 'utf8')}\n${path.endsWith('.js') || path.endsWith('.css') ? '/* changed fixture */' : '<!-- changed fixture -->'}`);
      expect((await buildWorker(context)).version).not.toBe(before.version);
    }); });
test('B005 source-data and evidence changes do not recache the archive or alter shell version',
  /** Verifies data snapshots and review records stay outside application-cache compatibility.
   * @returns Resolves after independent ignored-input changes.
   */
  async function dataIndependent() { await withFixture(
    /** Changes only fixture data/nonapplication evidence.
     * @param context Isolated build fixture.
     * @returns Resolves after unchanged shell assertions.
     * @remarks Replaces temporary data/README/test evidence.
     */
    async function check(context) { const before = await buildWorker(context); expect(before).toBeDefined();
      put(context.outDir, 'data/catalogue.json.gz', 'different complete catalogue fixture'); put(context.outDir, 'data/sittings/2.json.gz', 'another ignored data fixture');
      put(context.projectRoot, 'README.md', 'different prose'); put(context.projectRoot, 'tests/unit/fixture.test.ts', 'export {};');
      expect(await buildWorker(context)).toEqual(before);
    }); });
test('B006 additional shell assets are listed and invalidate version without omission',
  /** Verifies introduced images/fonts/HTML are counted as shell inputs.
   * @returns Resolves after extra-asset checks.
   */
  async function extraAssets() { await withFixture(
    /** Adds controlled nondata assets.
     * @param context Isolated output fixture.
     * @returns Resolves after list/version assertions.
     * @remarks Writes three temporary additional shell assets.
     */
    async function check(context) { const before = await buildWorker(context); expect(before).toBeDefined();
      for (const path of ['assets/font-X1X2X3X4.woff2', 'assets/logo-X1X2X3X4.png', 'extra.html']) put(context.outDir, path, 'controlled nondata bytes');
      const after = await buildWorker(context); expect(after.version).not.toBe(before.version);
      for (const path of ['assets/font-X1X2X3X4.woff2', 'assets/logo-X1X2X3X4.png', 'extra.html']) expect(after.assets).toContain(`${base}${path}`);
    }); });
for (const invalidBase of ['vote-better-malaysia/', '/vote-better-malaysia', '//other/', '/vote-better-malaysia/../other/', '/vote-better-malaysia/?x=1', '/vote-better-malaysia/#x', '/vote-better-malaysia/%2e%2e/', '/vote-better-malaysia/\\other/']) test(`B010 rejects invalid base ${invalidBase}`,
  /** Verifies escaped/noncanonical deployment paths never generate a worker.
   * @returns Resolves after rejected generation.
   */
  async function invalidBasePath() { await withFixture(
    /** Checks one invalid actual-base input.
     * @param context Isolated build fixture.
     * @returns Resolves after expected rejection.
     */
    async function check(context) { await expect(buildWorker({ ...context, base: invalidBase })).rejects.toThrow(); }); });
for (const path of ['index.html', 'help.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'assets/main-A1B2C3D4.js', 'assets/main-A1B2C3D4.css']) test(`B011 rejects missing required shell ${path}`,
  /** Verifies a narrow partial shell cannot be declared ready.
   * @returns Resolves after rejected incomplete build.
   */
  async function missingRequiredAsset() { await withFixture(
    /** Removes one required output fixture.
     * @param context Isolated output fixture.
     * @returns Resolves after expected rejection.
     * @remarks Removes one temporary required asset.
     */
    async function check(context) { rmSync(join(context.outDir, path)); await expect(buildWorker(context)).rejects.toThrow(); }); });
for (const field of ['start_url', 'scope', 'id'] as const) for (const value of ['/', '/other/', 'https://other.test/app/']) test(`B012 rejects off-base manifest ${field}=${value}`,
  /** Verifies website and installed-app identity use the same repository base.
   * @returns Resolves after invalid metadata rejection.
   */
  async function offBaseManifest() { await withFixture(
    /** Replaces one manifest base/identity field.
     * @param context Isolated output fixture.
     * @returns Resolves after expected rejection.
     * @remarks Changes the temporary manifest only.
     */
    async function check(context) { changeManifest(context,
      /** Writes one invalid manifest field.
       * @param manifest Controlled metadata.
       * @remarks Changes the supplied fixture object.
       */
      function change(manifest) { manifest[field] = value; }); await expect(buildWorker(context)).rejects.toThrow(); }); });
for (const kind of ['src', 'sizes', 'type', 'missing-icon']) test(`B013 rejects invalid required icon declaration ${kind}`,
  /** Verifies installed metadata points at the actual bounded PNG dimensions.
   * @returns Resolves after icon metadata rejection.
   */
  async function invalidIconMetadata() { await withFixture(
    /** Replaces one temporary icon declaration.
     * @param context Isolated build fixture.
     * @returns Resolves after expected rejection.
     * @remarks Changes only controlled install metadata.
     */
    async function check(context) { changeManifest(context,
      /** Introduces one invalid icon descriptor.
       * @param manifest Controlled metadata.
       * @remarks Changes the supplied fixture object.
       */
      function change(manifest) {
        if (kind === 'src') manifest.icons[0].src = '/other/icon-192.png';
        if (kind === 'sizes') manifest.icons[0].sizes = '512x512'; if (kind === 'type') manifest.icons[0].type = 'image/jpeg';
        if (kind === 'missing-icon') manifest.icons.pop();
      }); await expect(buildWorker(context)).rejects.toThrow(); }); });
for (const [path, bytes] of [['icons/icon-192.png', png(191, 192)], ['icons/icon-512.png', png(512, 511)],
  ['icons/icon-192.png', Buffer.from('not PNG')], ['icons/icon-512.png', png(512, 512).subarray(0, 20)]] as const) test(`B014 rejects invalid PNG/dimensions ${path}:${bytes.length}`,
  /** Verifies real PNG bytes/dimensions rather than the manifest's assertion.
   * @returns Resolves after invalid image rejection.
   */
  async function invalidPng() { await withFixture(
    /** Replaces one temporary icon body.
     * @param context Isolated output fixture.
     * @returns Resolves after expected rejection.
     * @remarks Writes deliberately invalid/wrong-sized fixture bytes.
     */
    async function check(context) { put(context.outDir, path, bytes); await expect(buildWorker(context)).rejects.toThrow(); }); });
test('B015 accepts exactly 61440 combined icon bytes without reducing icon dimensions',
  /** Verifies the inclusive stored icon budget with full required PNG dimensions.
   * @returns Resolves after exact-boundary acceptance.
   */
  async function iconByteBoundary() { await withFixture(
    /** Uses valid ancillary padding to exercise the exact combined byte budget.
     * @param context Isolated output fixture.
     * @returns Resolves after exact-limit acceptance.
     * @remarks Writes only temporary valid icon/build bytes.
     */
    async function check(context) {
      const small = png(192, 192); const large = png(512, 512); const padded = png(512, 512, 61440 - small.length - large.length - 20);
      expect(small.length + padded.length).toBe(61440); put(context.outDir, 'icons/icon-512.png', padded);
      expect(await buildWorker(context)).toBeDefined();
    }); });
test('B019 rejects 61441 combined icon bytes directly and preserves prior generated worker/index',
  /** Verifies one-byte-over rejection is independently observable before any successful new generation.
   * @returns Resolves after rejected oversized-icon replacement assertions.
   */
  async function iconOverLimit() { await withFixture(
    /** Seeds a prior accepted shell before supplying an oversized valid PNG.
     * @param context Isolated output fixture.
     * @returns Resolves after direct rejection and preserved-output checks.
     * @remarks Writes only temporary prior worker and oversized image bytes.
     */
    async function check(context) {
      const small = png(192, 192); const large = png(512, 512); const padded = png(512, 512, 61441 - small.length - large.length - 20);
      expect(small.length + padded.length).toBe(61441); put(context.outDir, 'icons/icon-512.png', padded); put(context.outDir, 'sw.js', 'prior accepted worker fixture');
      const before = readFileSync(join(context.outDir, 'index.html')); await expect(buildWorker(context)).rejects.toThrow();
      expect(readFileSync(join(context.outDir, 'sw.js'), 'utf8')).toBe('prior accepted worker fixture'); expect(readFileSync(join(context.outDir, 'index.html'))).toEqual(before);
    }); });
for (const privatePath of ['.env', '.cache/private.json', 'evidence/report.json', 'candidate.json']) test(`B016 rejects private deployed metadata ${privatePath}`,
  /** Verifies private state is rejected rather than precached or silently shipped.
   * @returns Resolves after unsafe output rejection.
   */
  async function privateOutput() { await withFixture(
    /** Adds a deliberately unsafe deployed fixture file.
     * @param context Isolated output fixture.
     * @returns Resolves after expected rejection.
     * @remarks Writes one temporary private-state marker.
     */
    async function check(context) { put(context.outDir, privatePath, 'private fixture'); await expect(buildWorker(context)).rejects.toThrow(); }); });
for (const symlinkKind of ['output-file', 'output-root', 'application-source']) test(`B017 rejects symlink escape ${symlinkKind}`,
  /** Verifies build input/output cannot follow external symlinks.
   * @returns Resolves after unsafe path rejection.
   */
  async function symlinkEscape() { await withFixture(
    /** Creates a controlled symlink to an outside fixture file/directory.
     * @param context Isolated build fixture.
     * @returns Resolves after expected rejection.
     * @remarks Creates temporary symlinks only.
     */
    async function check(context) {
      put(context.root, 'outside.js', 'external fixture');
      if (symlinkKind === 'output-file') symlinkSync(join(context.root, 'outside.js'), join(context.outDir, 'assets/external.js'));
      if (symlinkKind === 'application-source') { rmSync(join(context.projectRoot, 'src/main.ts')); symlinkSync(join(context.root, 'outside.js'), join(context.projectRoot, 'src/main.ts')); }
      if (symlinkKind === 'output-root') { const alias = join(context.root, 'aliased-dist'); symlinkSync(context.outDir, alias); context.outDir = alias; }
      await expect(buildWorker(context)).rejects.toThrow();
    }); });
test('B018 rejected manifest generation preserves already accepted worker and stamped index',
  /** Verifies validation precedes destructive generated-output replacement.
   * @returns Resolves after rejected replacement assertions.
   */
  async function failedReplacement() { await withFixture(
    /** Preserves fixture output when invalid install metadata is supplied.
     * @param context Isolated output fixture.
     * @returns Resolves after preserved-byte checks.
     * @remarks Seeds only temporary prior output and invalid metadata.
     */
    async function check(context) {
      put(context.outDir, 'sw.js', 'prior accepted worker fixture'); const before = readFileSync(join(context.outDir, 'index.html'));
      put(context.outDir, 'manifest.webmanifest', '{invalid'); await expect(buildWorker(context)).rejects.toThrow();
      expect(readFileSync(join(context.outDir, 'sw.js'), 'utf8')).toBe('prior accepted worker fixture'); expect(readFileSync(join(context.outDir, 'index.html'))).toEqual(before);
    }); });

/** Reads an optional generated output without converting its absence into a filesystem harness exception.
 * @param context Isolated build fixture.
 * @param path Relative generated path.
 * @returns Existing UTF-8 text, or null while generation is missing.
 */
function generated(context: BuildFixture, path: string): string | null {
  const file = join(context.outDir, path); return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

test('BREV001 complete sorted shell list and index stamp are reachable without a manifest-presence guard',
  /** Checks the required output directly rather than stopping at the first missing return value.
   * @returns Resolves after independently reachable asset-list and stamp assertions.
   */
  async function observableShellOutput() { await withFixture(
    /** Checks independently specified public resources and generated entry metadata.
     * @param context Isolated complete shell fixture.
     * @returns Resolves after nullable output assertions.
     */
    async function check(context) {
      const result = await buildWorker(context); const assets: string[] = [];
      for (const path of ['', 'index.html', 'help.html', 'assets/main-A1B2C3D4.js', 'assets/main-A1B2C3D4.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'sw.js']) assets.push(`${base}${path}`);
      expect.soft(result?.assets).toEqual(assets.sort());
      expect.soft(generated(context, 'index.html')).toMatch(/<meta\s+name="hansard-shell-version"\s+content="[a-f0-9]{64}"\s*\/?\s*>/);
      expect.soft(generated(context, 'sw.js')).toBeTypeOf('string');
    }); });

for (const path of ['src/main.ts', 'src/source.ts', 'src/messages.ts', 'src/styles.css', 'worker/service-worker.ts', 'scripts/build-worker.ts',
  'vite.config.ts', 'package-lock.json', 'src/storage.ts', 'src/updates.ts', 'package.json', 'tsconfig.json']) test(`BREV002 ${path} invalidates the shell without a first-build guard`,
  /** Reaches source/tool/current/future-module invalidation after two actual build invocations.
   * @returns Resolves after the direct version-difference assertion.
   */
  async function observableSourceInvalidation() { await withFixture(
    /** Keeps temporary source mutations syntactically valid before checking the required version change.
     * @param context Isolated project fixture.
     * @returns Resolves after independent before/after version checks.
     * @remarks Seeds/mutates only temporary application and configuration inputs.
     */
    async function check(context) {
      if (path === 'tsconfig.json') put(context.projectRoot, path, '{"compilerOptions":{"target":"ES2023"}}');
      if (path === 'src/storage.ts' || path === 'src/updates.ts') put(context.projectRoot, path, 'export const fixtureValue = 1;');
      const before = await buildWorker(context); const file = join(context.projectRoot, path); const prior = readFileSync(file, 'utf8');
      writeFileSync(file, path.endsWith('.json') ? JSON.stringify({ ...JSON.parse(prior), fixtureRevision: 2 }) : `${prior}\n/* controlled source revision */\n`);
      const after = await buildWorker(context); expect(after?.version).not.toBe(before?.version);
    }); });

for (const path of ['index.html', 'help.html', 'assets/main-A1B2C3D4.js', 'assets/main-A1B2C3D4.css', 'manifest.webmanifest', 'icons/icon-192.png']) test(`BREV003 actual ${path} bytes invalidate the shell without a first-build guard`,
  /** Reaches deployed-file byte invalidation while retaining valid install metadata and PNGs.
   * @returns Resolves after the direct version-difference assertion.
   */
  async function observableDeployedInvalidation() { await withFixture(
    /** Mutates one valid temporary nondata resource.
     * @param context Isolated deployed shell fixture.
     * @returns Resolves after independent byte-change invalidation checks.
     * @remarks Replaces only the controlled temporary deployed file.
     */
    async function check(context) {
      const before = await buildWorker(context); const file = join(context.outDir, path);
      if (path === 'icons/icon-192.png') put(context.outDir, path, png(192, 192, 1));
      else if (path === 'manifest.webmanifest') changeManifest(context,
        /** Changes only a valid manifest name while preserving all required base/icon metadata.
         * @param manifest Controlled fixture metadata.
         * @remarks Updates the supplied temporary object.
         */
        function change(manifest): void { manifest.name = 'Changed controlled fixture name'; });
      else writeFileSync(file, `${readFileSync(file, 'utf8')}\n${path.endsWith('.js') || path.endsWith('.css') ? '/* controlled byte revision */' : '<!-- controlled byte revision -->'}`);
      const after = await buildWorker(context); expect(after?.version).not.toBe(before?.version);
    }); });

test('BREV004 added nondata resources are included independently of earlier successful generation',
  /** Checks all added assets directly while keeping the original fixture's required resources intact.
   * @returns Resolves after positive newly introduced resource inclusion checks.
   */
  async function observableNewAssets() { await withFixture(
    /** Adds valid controlled nondata paths and checks their actual declared URLs.
     * @param context Isolated shell output fixture.
     * @returns Resolves after independent inclusion checks.
     * @remarks Creates only temporary extra shell resources.
     */
    async function check(context) {
      const paths = ['assets/font-X1X2X3X4.woff2', 'assets/logo-X1X2X3X4.png', 'extra.html'];
      for (const path of paths) put(context.outDir, path, path.endsWith('.png') ? png(1, 1) : 'controlled extra shell bytes');
      const result = await buildWorker(context);
      for (const path of paths) expect.soft(result?.assets ?? []).toContain(`${base}${path}`);
    }); });

test('BREV005 repeated builds expose version/output checks without absent-file harness errors',
  /** Reaches all repeat-output comparisons; missing identifier/output failures are generation RED, equality of absent values is a control.
   * @returns Resolves after valid output and deterministic-repeat checks.
   */
  async function observableRepeat() { await withFixture(
    /** Captures both generated bodies safely before and after repeat generation.
     * @param context Isolated stable source/build fixture.
     * @returns Resolves after valid version/body and repeated equality checks.
     */
    async function check(context) {
      const first = await buildWorker(context); const firstWorker = generated(context, 'sw.js'); const firstIndex = generated(context, 'index.html');
      const second = await buildWorker(context); const secondWorker = generated(context, 'sw.js'); const secondIndex = generated(context, 'index.html');
      expect.soft(first?.version ?? '').toMatch(/^[a-f0-9]{64}$/); expect.soft(second?.version ?? '').toMatch(/^[a-f0-9]{64}$/);
      expect.soft(firstWorker).toBeTypeOf('string'); expect.soft(secondWorker).toBeTypeOf('string');
      expect.soft(second).toEqual(first); expect.soft(secondWorker).toBe(firstWorker); expect.soft(secondIndex).toBe(firstIndex);
    }); });

test('BREV006 data and prose changes expose valid stable-shell checks without a first-build guard',
  /** Reaches exclusion comparisons; absent-value equality is recorded as a control rather than proof of data independence.
   * @returns Resolves after valid-shell and ignored-input comparison checks.
   */
  async function observableDataExclusion() { await withFixture(
    /** Changes only explicitly excluded source-data and nonapplication prose/test inputs.
     * @param context Isolated fixture project.
     * @returns Resolves after stable actual version/output comparisons.
     * @remarks Writes only temporary data, README and unit-fixture files.
     */
    async function check(context) {
      const before = await buildWorker(context); const beforeWorker = generated(context, 'sw.js');
      put(context.outDir, 'data/catalogue.json.gz', 'changed intentionally unverified layout fixture');
      put(context.outDir, 'data/sittings/2.json.gz', 'different intentionally unverified layout fixture');
      put(context.projectRoot, 'README.md', 'changed developer prose'); put(context.projectRoot, 'tests/unit/extra.test.ts', 'export {};');
      const after = await buildWorker(context);
      expect.soft(after?.version ?? '').toMatch(/^[a-f0-9]{64}$/); expect.soft(after?.assets ?? []).not.toContain(`${base}data/catalogue.json.gz`);
      expect.soft(after).toEqual(before); expect.soft(generated(context, 'sw.js')).toBe(beforeWorker);
    }); });

test('BREV007 the generated classic worker bootstraps actual production event bindings without lifecycle side effects',
  /** Executes generated bytes from the copied actual worker source against an inert native-shaped scope, not a synthetic console worker.
   * @returns Resolves after required listeners and no unsolicited platform operations are checked.
   */
  async function productionBootstrap() { await withFixture(
    /** Copies the real worker source and evaluates only generated classic script bytes in an isolated VM.
     * @param context Isolated temporary source/build fixture.
     * @returns Resolves after actual production bootstrap listener assertions.
     * @remarks Writes/evaluates temporary fixture bytes; never invokes install/activation or any real platform operation.
     */
    async function check(context) {
      put(context.projectRoot, 'worker/service-worker.ts', readFileSync('worker/service-worker.ts'));
      await buildWorker(context); const listeners = new Map<string, unknown>();
      /** Supplies an inert constructor identity when production checks the native scope class.
       * @returns Nothing; platform fields are independently supplied on its prototype instance.
       */
      function NativeScope(): void {}
      const scope = Object.assign(Object.create(NativeScope.prototype), {
        location: { origin: 'https://eaglecheow.github.io', pathname: `${base}sw.js` },
        caches: { open: vi.fn(), keys: vi.fn(), delete: vi.fn() }, clients: { matchAll: vi.fn(), get: vi.fn(), claim: vi.fn() },
        fetch: vi.fn(), skipWaiting: vi.fn(),
        /** Records actual production listener registration without firing events or supplying feature behavior.
         * @param type Native event type.
         * @param listener Actual generated listener.
         * @remarks Records registration in this controlled inert scope only.
         */
        addEventListener(type: string, listener: unknown): void { listeners.set(type, listener); },
      });
      const worker = generated(context, 'sw.js') ?? ''; const script = new Script(worker);
      script.runInNewContext({ self: scope, ServiceWorkerGlobalScope: NativeScope, location: scope.location, caches: scope.caches,
        clients: scope.clients, fetch: scope.fetch, skipWaiting: scope.skipWaiting, addEventListener: scope.addEventListener,
        URL, Request, Response, Map, Promise, console });
      expect.soft(worker).not.toBe(''); expect.soft([...listeners.keys()].sort()).toEqual(['activate', 'fetch', 'install', 'message']);
      for (const type of ['activate', 'fetch', 'install', 'message']) expect.soft(listeners.get(type)).toBeTypeOf('function');
      expect(scope.fetch).not.toHaveBeenCalled(); expect(scope.caches.open).not.toHaveBeenCalled(); expect(scope.caches.delete).not.toHaveBeenCalled();
      expect(scope.clients.claim).not.toHaveBeenCalled(); expect(scope.skipWaiting).not.toHaveBeenCalled();
    }); });

test('BHOOK001 production Vite close hooks generate the worker and version stamp in the resolved build output',
  /** Exercises the real exported build configuration against a controlled completed output.
   * @returns Completion after independently observed generated-file assertions.
   */
  async function productionBuildHook() { await withFixture(
    /** Supplies Vite's resolved root/base/output boundary without building or serving the actual repository.
     * @param context Isolated completed build fixture.
     * @returns Completion after invoking configured hooks and checking generated bytes.
     * @remarks Hooks may write only this supplied temporary output tree.
     */
    async function check(context) {
      const configuration = viteConfig as { plugins?: Array<{ configResolved?: (value: any) => void;
        closeBundle?: () => Promise<void> | void }> };
      for (const plugin of configuration.plugins ?? []) {
        if (typeof plugin.configResolved === 'function') plugin.configResolved({ root: context.projectRoot, base, build: { outDir: context.outDir } });
        if (typeof plugin.closeBundle === 'function') await plugin.closeBundle();
      }
      expect.soft(generated(context, 'sw.js')).toBeTypeOf('string');
      expect.soft(generated(context, 'index.html') ?? '').toMatch(/name="hansard-shell-version"\s+content="[a-f0-9]{64}"/);
    }); });
