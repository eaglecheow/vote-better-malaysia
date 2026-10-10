import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { expect, test } from 'vitest';
import { checkDocumentation, type DocumentationCandidate } from '../../scripts/check-documentation.ts';

const now = '2026-10-10T04:00:00.000Z';
const hash = 'a'.repeat(64);
const candidate: DocumentationCandidate = {
  sourceRevision: '1'.repeat(40),
  applicationFingerprint: hash,
  artifactDigest: hash,
  snapshotId: 'fixture-snapshot',
  fixtureHashes: { catalogue: hash, sitting: hash },
  conditionsDigest: hash,
  priorServedBaselineDigest: hash,
};
const topics = ['selection', 'reading', 'gaps', 'source', 'absence', 'errors', 'saved', 'install', 'updates'];
const documentedSource = `interface Box { value: number }
/** Adds one to the supplied value.
 * @param value Input number.
 * @returns Incremented number.
 */
export function helper(value: number): number { return value + 1; }
/** Doubles the supplied value.
 * @param value Input number.
 * @returns Doubled number.
 */
export const double = (value: number): number => value * 2;
export const mapped = [1].map(
  /** Maps a numeric entry to its increment.
   * @param value Current entry.
   * @returns Incremented entry.
   */
  (value: number): number => value + 1,
);
export class Store {
  /** Saves the supplied number on the caller's box.
   * @param box Caller-owned destination.
   * @param value Number to store.
   * @remarks Changes box.value in place.
   */
  set(box: Box, value: number): void { box.value = value; }
  /** Accepts a nonnegative number.
   * @param value Number to validate.
   * @returns Accepted number.
   * @throws Error when the number is negative.
   */
  checked(value: number): number {
    if (value < 0) throw new Error('negative');
    return value;
  }
}
`;

interface Fixture {
  root: string;
  reportPath: string;
  report: {
    candidate: DocumentationCandidate;
    reviewedAt: string;
    reviewer: string;
    accuracy: Record<string, boolean>;
    guideCoverage: { bm: string[]; en: string[] };
    files: Record<string, string>;
  };
}

/**
 * Hashes exact fixture bytes for a reviewer-bound code/document snapshot.
 * @param content Fixture UTF-8 content.
 * @returns Lowercase SHA-256 hexadecimal digest.
 */
function digest(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Writes one temporary fixture file and creates its parent directories.
 * @param root Temporary checkout directory.
 * @param path Checkout-relative file path.
 * @param content Exact file contents.
 * @remarks Creates directories and replaces a file in the temporary checkout.
 */
function put(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

/**
 * Creates complete source/document/review fixtures without touching project files.
 * @returns Temporary checkout and its independently asserted review metadata.
 * @remarks Creates a temporary directory and fixture files for the test.
 */
function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'hansard-docs-'));
  const files: Record<string, string> = {
    'src/sample.ts': documentedSource,
    'README.md': '[Developer](docs/development.md)\n[User](docs/user-guide.md)\n',
    'docs/development.md': '# Development\nRun `npm run check:docs` after the required checks.\n',
    'docs/user-guide.md': '# Reader\n## Bahasa Melayu\nPilih ahli dan persidangan untuk membaca sumbangan.\n## English\nSelect a member and sitting to read contributions.\n',
  };
  const fileHashes: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    put(root, path, content);
    fileHashes[path] = digest(content);
  }
  const report = {
    candidate: structuredClone(candidate),
    reviewedAt: now,
    reviewer: 'Fixture reviewer — synthetic test attestation',
    accuracy: { purpose: true, parameters: true, returns: true, errors: true, sideEffects: true, commands: true },
    guideCoverage: { bm: [...topics], en: [...topics] },
    files: fileHashes,
  };
  const reportPath = join(root, 'review.json');
  return { root, reportPath, report };
}

/**
 * Publishes the fixture review JSON with the current expected snapshot hashes.
 * @param item Temporary source/document/review fixture.
 * @remarks Replaces only the fixture review JSON.
 */
function saveReview(item: Fixture): void {
  writeFileSync(item.reportPath, JSON.stringify(item.report));
}

/**
 * Replaces a fixture file and updates its reviewed hash so another gate is isolated.
 * @param item Temporary source/document/review fixture.
 * @param path Checkout-relative file path.
 * @param content Replacement UTF-8 contents.
 * @remarks Replaces a temporary file and changes the synthetic attestation digest.
 */
function replaceReviewed(item: Fixture, path: string, content: string): void {
  put(item.root, path, content);
  item.report.files[path] = digest(content);
}

/**
 * Applies one failing documentation scenario to otherwise complete fixtures.
 * @param item Temporary source/document/review fixture.
 * @param scenario Stable behavioral test identifier.
 * @remarks Changes only temporary files or the synthetic review metadata.
 */
function breakFixture(item: Fixture, scenario: string): void {
  const uncommented = documentedSource.replace('/** Adds one to the supplied value.\n * @param value Input number.\n * @returns Incremented number.\n */\n', '');
  const changes: Record<string, string> = {
    undocumented: uncommented,
    purpose: documentedSource.replace('Adds one to the supplied value.', ''),
    parameters: documentedSource.replace(' * @param value Input number.\n', ''),
    returns: documentedSource.replace(' * @returns Incremented number.\n', ''),
    callback: documentedSource.replace(/  \/\*\* Maps[\s\S]*?\*\/\n/, ''),
    method: documentedSource.replace(/  \/\*\* Saves[\s\S]*?\*\/\n/, ''),
    errors: documentedSource.replace('   * @throws Error when the number is negative.\n', ''),
    sideEffects: documentedSource.replace('   * @remarks Changes box.value in place.\n', ''),
  };
  if (scenario in changes) replaceReviewed(item, 'src/sample.ts', changes[scenario]);
  if (scenario === 'arrow-sideEffects') replaceReviewed(item, 'src/sample.ts', documentedSource + `
/** Stores a caller-owned box value.
 * @param box Caller-owned destination.
 * @param value Number to store.
 * @returns Stored value.
 */
export const setBox = (box: Box, value: number): number => box.value = value;
`);
  if (scenario === 'closure-sideEffects') replaceReviewed(item, 'src/sample.ts', documentedSource + `
let shared = 0;
/** Replaces captured module state.
 * @param value Number to store.
 */
export function setShared(value: number): void { shared = value; }
`);
  if (scenario.startsWith('scope-')) {
    const path = scenario.slice('scope-'.length);
    replaceReviewed(item, path, 'export const overlooked = () => 1;\n');
  }
  if (scenario === 'developer-link') replaceReviewed(item, 'README.md', '[User](docs/user-guide.md)\n');
  if (scenario === 'user-link') replaceReviewed(item, 'README.md', '[Developer](docs/development.md)\n');
  if (scenario === 'missing-developer') rmSync(join(item.root, 'docs/development.md'));
  if (scenario === 'missing-user') rmSync(join(item.root, 'docs/user-guide.md'));
  if (scenario === 'empty-developer') replaceReviewed(item, 'docs/development.md', '');
  if (scenario === 'empty-user') replaceReviewed(item, 'docs/user-guide.md', '');
  if (scenario === 'language') replaceReviewed(item, 'docs/user-guide.md', '## Bahasa Melayu\nPanduan sahaja.\n');
  if (scenario === 'empty-language') replaceReviewed(item, 'docs/user-guide.md', '## Bahasa Melayu\nPanduan.\n## English\n');
  if (scenario === 'feature') item.report.guideCoverage.en = topics.filter(isNotSaved);
  if (scenario === 'accuracy') item.report.accuracy.errors = false;
  if (scenario === 'reviewer') item.report.reviewer = '';
  if (scenario === 'stale-file') put(item.root, 'src/sample.ts', documentedSource + '// changed after review\n');
  if (scenario === 'unreviewed-file') delete item.report.files['src/sample.ts'];
  if (scenario === 'expired') item.report.reviewedAt = '2026-10-02T03:59:59.000Z';
  if (scenario === 'future') item.report.reviewedAt = '2026-10-11T04:00:00.000Z';
  if (scenario === 'timestamp') item.report.reviewedAt = 'not a UTC timestamp';
  if (scenario === 'calendar') item.report.reviewedAt = '2026-04-31T03:00:00.000Z';
  if (scenario === 'candidate-shape') item.report.candidate.artifactDigest = 'not a SHA-256 digest';
  if (scenario === 'missing-baseline') delete (item.report.candidate as unknown as Record<string, unknown>).priorServedBaselineDigest;
  if (scenario.startsWith('candidate-')) {
    const field = scenario.slice('candidate-'.length) as keyof DocumentationCandidate;
    if (field === 'fixtureHashes') item.report.candidate.fixtureHashes = { catalogue: 'b'.repeat(64), sitting: hash };
    else item.report.candidate[field] = field === 'snapshotId' ? 'different-snapshot' : 'b'.repeat(field === 'sourceRevision' ? 40 : 64);
  }
}

/**
 * Omits saved-content guidance from the synthetic English coverage assertion.
 * @param topic Feature identifier in the required coverage list.
 * @returns Whether the identifier remains in this deliberately incomplete list.
 */
function isNotSaved(topic: string): boolean { return topic !== 'saved'; }

/**
 * Confirms the negative code fixture remains valid TypeScript before checking docs.
 * @returns Nothing; throws an assertion failure for unexpected compiler diagnostics.
 * @remarks Creates temporary fixture files and removes them after the assertion.
 */
function checksTypecheckingFixture(): void {
  const item = fixture();
  try {
    breakFixture(item, 'undocumented');
    const program = ts.createProgram([join(item.root, 'src/sample.ts')], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2023, types: [] });
    expect(ts.getPreEmitDiagnostics(program)).toEqual([]);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
}

/**
 * Accepts complete mechanical coverage plus an exact reviewed synthetic candidate.
 * @returns Nothing; throws an assertion failure if the complete fixture is rejected.
 * @remarks Creates and removes temporary fixture files.
 */
function checksCompleteFixture(): void {
  const item = fixture();
  try {
    saveReview(item);
    expect(checkDocumentation({ root: item.root, candidate, reportPath: item.reportPath, now })).toEqual([]);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
}

/**
 * Accepts internal fixture construction without demanding an external-effect claim.
 * @returns Nothing; throws an assertion failure if local mutation is misclassified.
 * @remarks Creates and removes temporary fixture files.
 */
function checksLocalConstruction(): void {
  const item = fixture();
  try {
    replaceReviewed(item, 'src/sample.ts', documentedSource + `
/** Creates a new box with the supplied value.
 * @param value Number to include in the new box.
 * @returns Newly constructed caller-independent box.
 */
export function makeBox(value: number): Box {
  const box = { value: 0 };
  box.value = value;
  return box;
}
`);
    saveReview(item);
    expect(checkDocumentation({ root: item.root, candidate, reportPath: item.reportPath, now })).toEqual([]);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
}

/**
 * Accepts explicit null as the reviewed first-publication baseline identity.
 * @returns Nothing; throws an assertion failure when initial publication is rejected.
 * @remarks Creates and removes temporary files; changes synthetic candidate metadata.
 */
function checksFirstPublication(): void {
  const item = fixture();
  try {
    const firstCandidate: DocumentationCandidate = { ...candidate, priorServedBaselineDigest: null };
    item.report.candidate = firstCandidate;
    saveReview(item);
    expect(checkDocumentation({ root: item.root, candidate: firstCandidate, reportPath: item.reportPath, now })).toEqual([]);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
}

/**
 * Rejects each missing comment, deliverable or exact review requirement independently.
 * @param scenario Behavioral test identifier selecting one incomplete fixture.
 * @returns Nothing; throws an assertion failure if the gate accepts invalid evidence.
 * @remarks Creates and removes temporary fixture files.
 */
function checksIncompleteFixture(scenario: string): void {
  const item = fixture();
  try {
    breakFixture(item, scenario);
    saveReview(item);
    if (scenario === 'missing-report') rmSync(item.reportPath);
    if (scenario === 'malformed-report') writeFileSync(item.reportPath, '{');
    if (scenario === 'report-shape') writeFileSync(item.reportPath, '[]');
    const clock = scenario === 'calendar' ? '2026-05-01T04:00:00.000Z' : now;
    expect(checkDocumentation({ root: item.root, candidate, reportPath: item.reportPath, now: clock }).length, scenario).toBeGreaterThan(0);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
}

/**
 * Rejects a CLI invocation without expected-candidate and accuracy-review evidence.
 * @returns Nothing; throws an assertion failure if the CLI exits successfully.
 * @remarks Starts a local Node process without touching checkout files.
 */
function checksMissingCliEvidence(): void {
  const result = spawnSync(process.execPath, [resolve('scripts/check-documentation.ts')], { encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('candidate');
}

test('DOC-typecheck: undocumented fixture still typechecks', checksTypecheckingFixture);
test('DOC-complete: exact reviewed fixture passes mechanical checks', checksCompleteFixture);
test('DOC-local: local construction is not an external side effect', checksLocalConstruction);
test('DOC-first-publication: explicit null baseline is valid', checksFirstPublication);
test.each([
  'undocumented', 'purpose', 'parameters', 'returns', 'callback', 'method', 'errors', 'sideEffects',
  'arrow-sideEffects', 'closure-sideEffects',
  'scope-tests/helper.test.ts', 'scope-worker/service-worker.ts', 'scope-scripts/tool.ts', 'scope-vite.config.ts',
  'developer-link', 'user-link', 'missing-developer', 'missing-user', 'empty-developer', 'empty-user',
  'language', 'empty-language', 'feature', 'accuracy', 'reviewer', 'stale-file', 'unreviewed-file',
  'expired', 'future', 'timestamp', 'calendar', 'missing-report', 'malformed-report', 'report-shape', 'candidate-shape', 'missing-baseline',
  'candidate-sourceRevision', 'candidate-applicationFingerprint', 'candidate-artifactDigest', 'candidate-snapshotId',
  'candidate-fixtureHashes', 'candidate-conditionsDigest', 'candidate-priorServedBaselineDigest',
])('DOC-invalid: rejects %s', checksIncompleteFixture);
test('DOC-cli: missing candidate/review fails closed', checksMissingCliEvidence);
