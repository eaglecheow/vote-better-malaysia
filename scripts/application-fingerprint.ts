import { lstat, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/** Collects real application inputs while excluding generated data and worker output.
 * @param root Reviewed checkout root.
 * @param path Canonical checkout-relative input path.
 * @param paths Local collection of regular input files.
 * @param recursive Whether this input is a recursively included directory scope.
 * @returns Completion after read-only enumeration; absent optional scopes are ignored.
 * @throws On symbolic, nonregular or unreadable included inputs.
 * @remarks Appends local paths without modifying checkout files.
 */
async function collect(root: string, path: string, paths: string[], recursive: boolean): Promise<void> {
  if (path === 'public/data' || path === 'public/sw.js') return;
  let stats;
  try { stats = await lstat(join(root, path)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  if (stats.isSymbolicLink()) throw new Error('Symbolic application input: ' + path);
  if (stats.isDirectory() && recursive) {
    for (const name of await readdir(join(root, path))) await collect(root, path + '/' + name, paths, true);
  } else {
    if (!stats.isFile()) throw new Error('Nonregular application input: ' + path);
    paths.push(path);
  }
}

/** Measures the shared application/tool/configuration/workflow/public input set.
 * @param root Reviewed source checkout; generated build and evidence live outside its input scopes.
 * @returns SHA-256 of sorted relative-path, byte-length and exact-file-digest triples.
 * @throws On symbolic, nonregular or unreadable application inputs.
 */
export async function applicationFingerprint(root: string): Promise<string> {
  const paths: string[] = [];
  for (const directory of ['src', 'worker', 'scripts', '.github/workflows', 'public']) await collect(root, directory, paths, true);
  for (const path of ['index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', '.nvmrc',
    'playwright.config.ts', 'vitest.config.ts']) await collect(root, path, paths, false);
  const files: Array<[string, number, string]> = [];
  for (const path of paths.sort()) {
    const bytes = await readFile(join(root, path)); files.push([path, bytes.length, createHash('sha256').update(bytes).digest('hex')]);
  }
  return createHash('sha256').update(JSON.stringify(files)).digest('hex');
}
