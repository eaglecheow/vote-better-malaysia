import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test } from 'vitest';
import { applicationFingerprint } from '../../scripts/publication.ts';

// Controlled byte inputs exercise fingerprint membership, not application execution,
// source validation or PNG acceptance. No actual source/build/public files are changed.
const inputs: Record<string, string | Buffer> = {
  'src/main.ts': 'export const reader = 1;',
  'src/source.ts': 'export const source = 1;',
  'src/messages.ts': 'export const locale = "ms";',
  'src/styles.css': 'body { color: black; }',
  'src/storage.ts': 'export const saved = 1;',
  'src/updates.ts': 'export const waiting = 1;',
  'worker/service-worker.ts': 'export const worker = 1;',
  'scripts/acquire.ts': 'export const acquisition = 1;',
  'scripts/check-performance.ts': 'export const budgets = 1;',
  'scripts/build-worker.ts': 'export const builder = 1;',
  'scripts/check-documentation.ts': 'export const documentation = 1;',
  'scripts/collect-performance.ts': 'export const collector = 1;',
  'scripts/publication.ts': 'export const publication = 1;',
  '.github/workflows/pages.yml': 'name: Pages\non: workflow_dispatch\njobs: {}\n',
  '.github/workflows/ci.yml': 'name: CI\non: pull_request\njobs: {}\n',
  '.nvmrc': '24.21.0\n',
  'index.html': '<!doctype html><html><head><title>Reader</title></head><body></body></html>',
  'package.json': '{"type":"module","devDependencies":{"vite":"8.3.4"}}',
  'package-lock.json': '{"lockfileVersion":3}',
  'vite.config.ts': 'export default { base: "/vote-better-malaysia/" };',
  'tsconfig.json': '{"compilerOptions":{"strict":true}}',
  'playwright.config.ts': 'export default { projects: ["chromium", "firefox", "webkit"] };',
  'vitest.config.ts': 'export default { test: { environment: "node" } };',
  'public/help.html': '<!doctype html><html><body>BM and English controlled help.</body></html>',
  'public/manifest.webmanifest': '{"id":"/vote-better-malaysia/","scope":"/vote-better-malaysia/"}',
  'public/icons/icon-192.png': Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]),
  'public/icons/icon-512.png': Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 2]),
};

/** Digests independently defined expected input bytes.
 * @param bytes Exact controlled fixture bytes.
 * @returns Lowercase SHA-256 digest.
 */
function digest(bytes: string | Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }

/** Writes one controlled input without touching production files.
 * @param root Isolated temporary checkout.
 * @param path Checkout-relative fixture path.
 * @param bytes Exact text or binary fixture bytes.
 * @returns Nothing after the temporary write.
 * @remarks Creates temporary parents and replaces only the selected fixture.
 */
function put(root: string, path: string, bytes: string | Buffer): void {
  mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes);
}

/** Creates a complete controlled application-input tree in chosen creation order.
 * @param reverse Whether to reverse filesystem creation order.
 * @returns Isolated temporary checkout root.
 * @remarks Writes fixture inputs only; excluded output/data are added by individual cases.
 */
function fixture(reverse = false): string {
  const root = mkdtempSync(join(tmpdir(), 'hansard-application-fingerprint-'));
  const paths = Object.keys(inputs); if (reverse) paths.reverse();
  for (const path of paths) put(root, path, inputs[path]);
  return root;
}

/** Runs a fingerprint behavior against one temporary tree and always removes it.
 * @param action Assertions using that fixture root.
 * @returns Completion after the assertions and cleanup.
 * @throws The actual assertion or filesystem failure.
 * @remarks Creates and recursively removes only this controlled temporary directory.
 */
async function withFixture(action: (root: string) => Promise<void>): Promise<void> {
  const root = fixture(); try { await action(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

for (const path of Object.keys(inputs)) test(`AFP001 exact input byte changes invalidate ${path}`,
  /** Compares actual before/after fingerprints for one required input.
   * @returns Completion after isolated byte-change assertions.
   */
  async function changesInput() { await withFixture(
    /** Changes only the chosen controlled input after obtaining a valid initial digest.
     * @param root Isolated temporary checkout.
     * @returns Completion after the actual digest comparison.
     * @remarks Replaces one temporary file with different exact bytes.
     */
    async function compare(root) {
      const before = await applicationFingerprint(root); expect(before).toMatch(/^[a-f0-9]{64}$/);
      const original = readFileSync(join(root, path)); const changed = typeof inputs[path] === 'string'
        ? Buffer.concat([original, Buffer.from('\n')]) : Buffer.from(original);
      if (typeof inputs[path] !== 'string') changed[changed.length - 1] ^= 1;
      put(root, path, changed); const after = await applicationFingerprint(root);
      expect(after).toMatch(/^[a-f0-9]{64}$/); expect(after).not.toBe(before);
    }); });

test('AFP002 canonical digest includes the sorted path, byte length and hash of every intended input',
  /** Uses an independent full membership oracle, rather than the production enumerator.
   * @returns Completion after comparison with the exact canonical expected digest.
   */
  async function canonicalInputs() { await withFixture(
    /** Calculates the contract's independently defined canonical fixture digest.
     * @param root Isolated temporary checkout.
     * @returns Completion after the canonical-digest assertion.
     */
    async function compare(root) {
      const expected: Array<[string, number, string]> = [];
      for (const path of Object.keys(inputs).sort()) { const bytes = Buffer.from(inputs[path]); expected.push([path, bytes.length, digest(bytes)]); }
      expect(await applicationFingerprint(root)).toBe(digest(JSON.stringify(expected)));
    }); });

const additionalInputs = ['src/nested/feature.ts', 'worker/nested/helper.ts', 'scripts/nested/validation.ts',
  '.github/workflows/another-check.yml', 'public/fonts/reader.woff2'];
for (const path of additionalInputs) test(`AFP003 adding an application input invalidates ${path}`,
  /** Checks that newly introduced inputs cannot silently reuse old reports.
   * @returns Completion after isolated membership-change assertions.
   */
  async function addsInput() { await withFixture(
    /** Adds one file only after measuring the complete fixture's initial fingerprint.
     * @param root Isolated temporary checkout.
     * @returns Completion after actual before/after comparisons.
     * @remarks Adds one controlled temporary input.
     */
    async function compare(root) {
      const before = await applicationFingerprint(root); put(root, path, 'Controlled new application input.');
      const after = await applicationFingerprint(root); expect(after).toMatch(/^[a-f0-9]{64}$/); expect(after).not.toBe(before);
    }); });

const excludedInputs = ['public/data/catalogue.json.gz', 'public/data/sittings/1.json.gz', 'public/sw.js',
  'dist/index.html', 'dist/sw.js', '.cache/hansard/candidates/candidate.json',
  'specs/001-read-mp-hansard/evidence/performance.json', 'specs/001-read-mp-hansard/evidence/ci-inputs.json',
  'tests/unit/reader.test.ts', 'README.md', 'docs/development.md', 'docs/user-guide.md'];
for (const path of excludedInputs) test(`AFP004 generated/data/evidence-only changes preserve ${path}`,
  /** Verifies excluded files remain excluded for both introduction and changed bytes.
   * @returns Completion after unchanged-fingerprint assertions.
   */
  async function excludesInput() { await withFixture(
    /** Introduces and mutates controlled output/evidence without touching application inputs.
     * @param root Isolated temporary checkout.
     * @returns Completion after both actual before/after comparisons.
     * @remarks Writes only one excluded temporary fixture file.
     */
    async function compare(root) {
      const before = await applicationFingerprint(root);
      put(root, path, '<meta name="hansard-shell-version" content="' + 'a'.repeat(64) + '">');
      expect(await applicationFingerprint(root)).toBe(before);
      put(root, path, '<meta name="hansard-shell-version" content="' + 'b'.repeat(64) + '">');
      expect(await applicationFingerprint(root)).toBe(before);
    }); });

test('AFP005 unchanged inputs are deterministic and filesystem creation order is irrelevant',
  /** Compares two independent fixture roots and a repeated actual function call.
   * @returns Completion after deterministic-order controls.
   * @remarks Creates and removes only two isolated temporary fixture trees.
   */
  async function deterministicOrder() {
    const first = fixture(); const second = fixture(true);
    try { const before = await applicationFingerprint(first); expect(before).toMatch(/^[a-f0-9]{64}$/);
      expect(await applicationFingerprint(first)).toBe(before); expect(await applicationFingerprint(second)).toBe(before);
    } finally { rmSync(first, { recursive: true, force: true }); rmSync(second, { recursive: true, force: true }); }
  });

test('AFP006 input paths invalidate fingerprints even when the renamed file keeps identical bytes',
  /** Checks the path component independently of changed file contents or byte length.
   * @returns Completion after the path-change assertion.
   */
  async function renamesInput() { await withFixture(
    /** Renames a source input without changing its exact bytes.
     * @param root Isolated temporary checkout.
     * @returns Completion after the actual digest comparison.
     * @remarks Renames only one temporary source fixture.
     */
    async function compare(root) { const before = await applicationFingerprint(root);
      renameSync(join(root, 'src/main.ts'), join(root, 'src/renamed.ts')); expect(await applicationFingerprint(root)).not.toBe(before);
    }); });

const unsafeInputs = ['src/unsafe.ts', 'worker/unsafe.ts', 'scripts/unsafe.ts', '.github/workflows/unsafe.yml', 'public/unsafe.html'];
for (const path of unsafeInputs) test(`AFP007 symbolic application inputs are rejected at ${path}`,
  /** Checks actual filesystem symlink rejection rather than following linked input bytes.
   * @returns Completion after the direct rejection assertion.
   */
  async function rejectsSymbolicInput() { await withFixture(
    /** Adds a real symlink to an existing controlled source input.
     * @param root Isolated temporary checkout.
     * @returns Completion after the actual fingerprint promise rejects.
     * @remarks Creates a symlink only inside the temporary fixture tree.
     */
    async function reject(root) {
      symlinkSync(join(root, 'src/main.ts'), join(root, path));
      await expect(applicationFingerprint(root)).rejects.toThrow(/symbolic|symlink/i);
    }); });

for (const path of unsafeInputs) test(`AFP008 nonregular application inputs are rejected at ${path}`,
  /** Checks a real FIFO is rejected before any attempt to read it can block.
   * @returns Completion after the direct rejection assertion.
   */
  async function rejectsNonregularInput() { await withFixture(
    /** Creates a native FIFO in one enumerated application directory.
     * @param root Isolated temporary checkout.
     * @returns Completion after the actual fingerprint promise rejects.
     * @remarks Invokes native mkfifo only for the temporary fixture path.
     * @throws On unavailable mkfifo or fixture creation failure, which is not behavioral RED.
     */
    async function reject(root) {
      execFileSync('mkfifo', [join(root, path)]);
      await expect(applicationFingerprint(root)).rejects.toThrow(/nonregular|unsupported|regular/i);
    }); });
