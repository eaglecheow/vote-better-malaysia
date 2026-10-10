import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { relative, resolve, join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { DATA_LIMITS, validateCatalogue, validateSittingRecord, type Catalogue } from '../src/source.ts';
import { isCandidate, isCurrentReview, sameCandidate, type DocumentationCandidate } from './check-documentation.ts';

type ObjectValue = Record<string, any>;
export interface ArtifactSizes {
  shellGzip: number; jsGzip: number; iconBytes: number; artifactBytes: number;
  artifactDigest: string; catalogueGzip: number; catalogueDecoded: number;
  sittings: Array<{ path: string; gzip: number; decoded: number }>;
  files: Array<[string, number, string]>;
  layoutComplete: boolean; sourceVerified: boolean; complete: boolean;
  snapshot: { snapshotId: string; preparedAt: string; publishedAt: string | null;
    coverage: Catalogue['coverage']; status: Catalogue['status']; sittingCount: number } | null;
}

const targetHardware: Record<string, string> = {
  'android-chrome': 'Google Pixel 6a', 'iphone-safari': 'Apple iPhone 13',
  'desktop-chrome': 'Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop',
  'desktop-edge': 'Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop',
  'desktop-firefox': 'Intel Core i5-8250U, 8 GiB RAM, Windows 11 x64 laptop',
  'desktop-safari': 'MacBook Air M1, 8 GiB RAM, supported stable macOS',
};

/** Rejects a missing gate requirement.
 * @param condition Required assertion.
 * @param message Failure context.
 * @returns Nothing; narrows the required condition for subsequent checks.
 * @throws Error when the condition fails.
 */
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
/** Narrows parsed report data before field access.
 * @param value Parsed field.
 * @param label Field context.
 * @returns Unchanged object.
 * @throws Error for absent/null/array values.
 */
function object(value: unknown, label: string): ObjectValue {
  requireValue(typeof value === 'object' && value !== null && !Array.isArray(value), `${label}: object required`);
  return value as ObjectValue;
}
/** Requires a finite nonnegative measurement without coercion.
 * @param value Measurement.
 * @param label Field context.
 * @param integer Whether integer bytes/counts are required.
 * @returns Validated number.
 * @throws Error for malformed measurements.
 */
function number(value: unknown, label: string, integer = false): number {
  requireValue(typeof value === 'number' && Number.isFinite(value) && value >= 0 && (!integer || Number.isInteger(value)), `${label}: finite nonnegative measurement required`);
  return value;
}
/** Enforces an inclusive measured ceiling.
 * @param value Measurement.
 * @param limit Maximum.
 * @param label Field/units context.
 * @param integer Whether integer units apply.
 * @throws Error for invalid or excessive values.
 */
function ceiling(value: unknown, limit: number, label: string, integer = false): void {
  requireValue(number(value, label, integer) <= limit, `${label}: exceeded ${limit}`);
}
/** Requires recorded versions/conditions without inferring authenticity.
 * @param value Metadata.
 * @param label Field context.
 * @throws Error for empty metadata.
 */
function text(value: unknown, label: string): void {
  requireValue(typeof value === 'string' && value.trim().length > 0, `${label}: version/metadata required`);
}
/** Enforces the inclusive seven-day applicability window.
 * @param value UTC review timestamp.
 * @param now Independent current UTC instant.
 * @param label Report context.
 * @throws Error for invalid/future/expired evidence.
 */
function currentEvidence(value: unknown, now: string, label: string): void {
  requireValue(isCurrentReview(value, now), `${label}: invalid UTC calendar instant, future or expired evidence`);
}
/** Applies nearest-rank percentiles to exactly twenty raw runs.
 * @param values Raw lab measurements.
 * @param rank Percentile fraction.
 * @param limit Inclusive operation ceiling.
 * @param label Profile/operation context.
 * @throws Error for absent/invalid runs or an exceeded percentile.
 */
function percentile(values: unknown, rank: number, limit: number, label: string): void {
  requireValue(Array.isArray(values) && values.length === 20, `${label}: exactly 20 raw runs required`);
  const sorted: number[] = [];
  for (const value of values) sorted.push(number(value, label));
  sorted.sort(compareNumbers);
  requireValue(sorted[Math.ceil(20 * rank) - 1] <= limit, `${label}: nearest-rank percentile exceeded ${limit}`);
}
/** Orders measurements numerically.
 * @param left First value.
 * @param right Second value.
 * @returns Numeric ordering.
 */
function compareNumbers(left: number, right: number): number { return left - right; }
/** Orders decoded records with stable path tie-breaking.
 * @param left First record.
 * @param right Second record.
 * @returns Size/path ordering.
 */
function compareRecords(left: ObjectValue, right: ObjectValue): number {
  return left.decoded - right.decoded || (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}
/** Verifies exact decimal network, viewport and CPU conditions.
 * @param value Lab/actual-target metadata.
 * @param mobile Whether mobile conditions apply.
 * @param actual Whether this is physical rather than a lab proxy.
 * @throws Error for substituted conditions.
 */
function conditions(value: ObjectValue, mobile: boolean, actual: boolean): void {
  requireValue(value.downloadKbps === (mobile ? 1600 : 10000) && value.uploadKbps === (mobile ? 750 : 2000)
    && value.rttMs === (mobile ? 150 : 40) && value.cpuSlowdown === (actual ? 1 : mobile ? 4 : 1), 'network/CPU conditions mismatch (decimal Kbps)');
  const viewport = actual && mobile ? 'native' : mobile ? [390, 844] : [1440, 900];
  requireValue(JSON.stringify(value.viewport) === JSON.stringify(viewport), 'viewport conditions mismatch');
}

/** Enforces every size, independent lab profile and actual-target report requirement.
 * @param input Report and independently supplied candidate/repository/clock.
 * @returns True for matching supplied evidence; not proof of authenticity, real-device
 * execution, source acquisition or field compliance.
 * @throws Error for exceeded budgets or missing/mismatched evidence.
 */
export function evaluateBudgets(input: unknown): true {
  const report = object(input, 'performance report');
  requireValue(isCandidate(report.expectedCandidate) && isCandidate(report.candidate)
    && sameCandidate(report.candidate, report.expectedCandidate), 'exact candidate/revision mismatch');
  const candidate: DocumentationCandidate = report.expectedCandidate;
  text(report.now, 'current clock'); currentEvidence(report.reviewedAt, report.now, 'performance report');
  const origin = object(report.origin, 'trusted report origin'); text(report.expectedRepository, 'expected repository');
  requireValue(origin.trusted === true && origin.branch === 'main' && origin.repository === report.expectedRepository, 'untrusted default-branch report origin');
  const sizes = object(report.sizes, 'measured sizes');
  for (const [field, maximum] of Object.entries({ shellGzip: 153600, jsGzip: 102400, iconBytes: 61440, artifactBytes: DATA_LIMITS.stagedData,
    catalogueGzip: DATA_LIMITS.catalogueGzip, catalogueDecoded: DATA_LIMITS.decoded })) ceiling(sizes[field], maximum, `${field} bytes`, true);
  requireValue(sizes.complete === true && sizes.layoutComplete === true && sizes.sourceVerified === true, 'complete validated source snapshot/layout required');
  requireValue(Array.isArray(sizes.sittings) && sizes.sittings.length > 0, 'complete per-sitting measurements required');
  const recordPaths = new Map<string, number>(); const ranked: ObjectValue[] = [];
  for (const item of sizes.sittings) {
    const record = object(item, 'sitting measurement');
    requireValue(typeof record.path === 'string' && /^data\/sittings\/[1-9]\d*\.json\.gz$/.test(record.path) && !recordPaths.has(record.path), 'unique fixed sitting path required');
    ceiling(record.gzip, DATA_LIMITS.sittingGzip, `${record.path} gzip bytes`, true);
    ceiling(record.decoded, DATA_LIMITS.decoded, `${record.path} decoded bytes`, true);
    recordPaths.set(record.path, record.decoded); ranked.push(record);
  }
  const coverage = object(report.sourceCoverage, 'full-source coverage');
  requireValue(number(coverage.expected, 'expected sittings', true) > 0 && coverage.expected === coverage.accounted
    && coverage.availableRecords === recordPaths.size && coverage.availableRecords <= coverage.accounted
    && coverage.snapshotId === candidate.snapshotId, 'full-source accounting/snapshot mismatch');
  ranked.sort(compareRecords);
  const roles: Record<string, string> = { median: ranked[Math.ceil(ranked.length * 0.5) - 1].path,
    p95: ranked[Math.ceil(ranked.length * 0.95) - 1].path, largest: ranked.at(-1)!.path };
  for (const path of Object.values(roles)) requireValue(Object.hasOwn(candidate.fixtureHashes, path), `frozen ranked fixture hash required: ${path}`);
  const served = object(report.servedBytes, 'actual served bytes'); requireValue('index.html' in served, 'actual served shell bytes required');
  for (const value of Object.values(served)) number(value, 'actual served bytes', true);
  for (const path of Object.keys(candidate.fixtureHashes)) requireValue(path in served, `actual served fixture bytes missing: ${path}`);
  requireValue('data/catalogue.json.gz' in candidate.fixtureHashes, 'full-catalogue fixture hash required');
  const runner = object(report.runner, 'laboratory runner');
  requireValue(runner.label === 'ubuntu-24.04' && runner.arch === 'x64' && runner.vcpus === 4 && runner.memoryGiB === 16
    && runner.os === 'Ubuntu 24.04' && runner.browserProcesses === 1 && runner.concurrentMeasurements === 1, 'laboratory runner allocation/conditions mismatch');
  for (const field of ['cpu', 'image', 'node', 'browser']) text(runner[field], `runner ${field}`);
  requireValue(/^24\./.test(runner.node), 'Node 24 LTS measurement version required');
  const tools = object(runner.tools, 'pinned tool versions'); text(tools.playwright, 'Playwright version'); text(tools.vite, 'Vite version');
  requireValue(Array.isArray(report.profiles) && report.profiles.length === 2, 'mobile and desktop raw lab profiles required');
  const profiles = new Set<string>();
  for (const item of report.profiles) {
    const profile = object(item, 'laboratory profile');
    requireValue((profile.profile === 'mobile' || profile.profile === 'desktop') && !profiles.has(profile.profile), 'unique mobile/desktop profile required');
    profiles.add(profile.profile); const mobile = profile.profile === 'mobile'; conditions(profile, mobile, false);
    requireValue(profile.coldCacheCleared === true && profile.repeatPrepopulated === true && profile.completeValidatedResults === true, 'cold/repeat/complete-result run conditions required');
    requireValue(Array.isArray(profile.interactionKinds) && ['selection', 'language', 'read'].every(hasInteraction.bind(null, profile.interactionKinds)), 'all required interaction kinds needed');
    for (const [field, limit, rank] of [['lcpMs', 2500, 0.75], ['cls', 0.1, 0.75], ['tbtMs', 200, 0.75],
      ['coldCatalogueMs', 5000, 0.95], ['repeatReaderMs', 1000, 0.95], ['interactionMs', 200, 0.95]] as const) percentile(profile[field], rank, limit, `${profile.profile} ${field}`);
    requireValue(Array.isArray(profile.processing) && profile.processing.length === 3, 'median/p95/largest raw processing datasets required');
    const datasets = new Set<string>();
    for (const item of profile.processing) {
      const processing = object(item, 'processing dataset');
      requireValue(processing.dataset in roles && !datasets.has(processing.dataset), 'unique median/p95/largest dataset required'); datasets.add(processing.dataset);
      requireValue(processing.fixturePath === roles[processing.dataset] && processing.fixtureHash === candidate.fixtureHashes[processing.fixturePath], 'frozen dataset role/path/hash mismatch');
      percentile(processing.ms, 0.95, mobile ? 500 : 200, `${profile.profile} ${processing.dataset} complete processing ms`);
    }
  }
  requireValue(Array.isArray(report.devices) && report.devices.length === 6, 'all six actual-target reports required');
  const targets = new Set<string>();
  for (const item of report.devices) {
    const device = object(item, 'actual-target report');
    requireValue(typeof device.target === 'string' && device.target in targetHardware && !targets.has(device.target), 'unique required actual target needed');
    targets.add(device.target); const mobile = device.target === 'android-chrome' || device.target === 'iphone-safari';
    requireValue(device.hardware === targetHardware[device.target], `${device.target}: physical hardware mismatch`);
    conditions(device, mobile, true); requireValue(mobile || device.power === 'AC', 'desktop AC power required');
    requireValue(device.batterySaver === false && device.unrelatedApplicationsClosed === true && device.stableAtAcceptance === true, 'stable actual-target operating conditions required');
    text(device.os, 'actual supported OS'); text(device.browserVersion, 'actual stable browser version');
    requireValue(isCandidate(device.candidate) && sameCandidate(device.candidate, candidate), `${device.target}: exact candidate mismatch`);
    currentEvidence(device.reviewedAt, report.now, device.target);
    requireValue(Array.isArray(device.localeChecks) && device.localeChecks.includes('ms') && device.localeChecks.includes('en'), 'both locale journeys required');
    requireValue(device.offlineClosed === true && device.offlineNetworkDisabled === true && device.savedComplete === true && device.onlineComplete === true
      && Array.isArray(device.offlineScenarios) && device.offlineScenarios.includes('largest') && device.offlineScenarios.includes('gaps'), 'complete closed-reader/saved/gap offline and online journeys required');
    requireValue(Array.isArray(device.offlineMs) && device.offlineMs.length === 10, 'exactly ten offline attempts required per target');
    for (const ms of device.offlineMs) ceiling(ms, 2000, `${device.target} offline ms`);
    requireValue(Array.isArray(device.online) && device.online.length === 30, 'exactly thirty online attempts required per target');
    let successes = 0; const sittingIds = new Set<string>(); const distinctSizes = new Set<number>();
    for (const item of device.online) {
      const attempt = object(item, 'online attempt');
      requireValue(typeof attempt.sittingId === 'string' && /^[1-9]\d*$/.test(attempt.sittingId), 'online exact sitting ID required');
      const path = `data/sittings/${attempt.sittingId}.json.gz`;
      requireValue(recordPaths.has(path) && attempt.decodedBytes === recordPaths.get(path), 'online sitting/decoded-size mismatch');
      sittingIds.add(attempt.sittingId); distinctSizes.add(attempt.decodedBytes); requireValue(typeof attempt.success === 'boolean', 'online outcome required');
      if (attempt.success) { if (number(attempt.ms, 'online successful ms') <= 5000) successes += 1; }
      else if (attempt.ms !== null) number(attempt.ms, 'failed online ms');
    }
    requireValue(sittingIds.size >= 5 && distinctSizes.size >= 5, 'five differently sized online sittings required');
    requireValue(successes >= 29, `${device.target}: fewer than 29/30 complete online results within 5000 ms`);
  }
  const field = object(report.field, 'independent field-data disclosures');
  for (const group of ['mobile', 'desktop']) requireValue(field[group] === 'unavailable' || field[group] === 'insufficient', `separate ${group} unverified field-data disclosure required; lab is not field CWV`);
  return true;
}
/** Checks a required interaction label.
 * @param kinds Recorded identifiers.
 * @param kind Required identifier.
 * @returns Whether the label is present.
 */
function hasInteraction(kinds: string[], kind: string): boolean { return kinds.includes(kind); }
/** Hashes exact bytes without rewriting files.
 * @param bytes Stored/decoded bytes or canonical manifest text.
 * @returns SHA-256 hexadecimal digest.
 */
function digest(bytes: Buffer | string): string { return createHash('sha256').update(bytes).digest('hex'); }
/** Counts deterministic level-nine shell gzip with fixed zero timestamp.
 * @param bytes Uncompressed asset bytes.
 * @returns Gzip byte length; original files are unchanged.
 */
function shellGzip(bytes: Buffer): number {
  const gzip = gzipSync(bytes, { level: 9 }); gzip.writeUInt32LE(0, 4); return gzip.length;
}
/** Collects every regular file, rejecting links/private state instead of omitting it.
 * @param root Frozen artifact root.
 * @param directory Current relative directory.
 * @param paths Mutable relative-path collection.
 * @remarks Adds paths to the collection without filesystem writes.
 * @throws Error for links/private paths/unreadable entries.
 */
async function collectFiles(root: string, directory: string, paths: string[]): Promise<void> {
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    requireValue(!['.git', '.cache', 'node_modules', 'evidence', 'receipts'].includes(entry.name)
      && !entry.name.startsWith('.env') && !/^(candidate|fixtures|report|.*receipt.*|performance.*|documentation-review)\.json$/.test(entry.name), `private metadata/state must stay outside artifact: ${path}`);
    const stats = await lstat(join(root, path)); requireValue(!stats.isSymbolicLink(), `artifact symlink rejected: ${path}`);
    if (stats.isDirectory()) await collectFiles(root, path, paths);
    else { requireValue(stats.isFile(), `regular artifact file required: ${path}`); paths.push(path); }
  }
}
/** Independently measures all files and normalized source references in a frozen artifact.
 * @param root Frozen directory; metadata/receipts belong outside it.
 * @returns Stored-byte manifest/digest, gzip accounting and distinct layout/source flags.
 * Source validation covers supplied schema/accounting, not current official acquisition
 * completeness, browser execution or actual performance.
 * @throws Error for missing assets/unsafe paths/excess bytes/invalid gzip/UTF-8/JSON.
 */
export async function measureArtifact(root: string): Promise<ArtifactSizes> {
  const stats = await lstat(root); requireValue(stats.isDirectory() && !stats.isSymbolicLink(), 'regular artifact directory required');
  const paths: string[] = []; await collectFiles(root, '', paths); paths.sort();
  for (const required of ['index.html', 'manifest.webmanifest', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png', 'data/catalogue.json.gz']) requireValue(paths.includes(required), `missing required artifact asset: ${required}`);
  requireValue(paths.some(isApplicationJs) && paths.some(isCss) && paths.some(isSitting), 'missing required application JS/CSS/sitting assets');
  const result: ArtifactSizes = { shellGzip: 0, jsGzip: 0, iconBytes: 0, artifactBytes: 0, artifactDigest: '', catalogueGzip: 0,
    catalogueDecoded: 0, sittings: [], files: [], layoutComplete: true, sourceVerified: true, complete: false, snapshot: null };
  let catalogue: Catalogue | null = null; const matched = new Set<string>();
  for (const path of paths) {
    const fileStats = await lstat(join(root, path)); ceiling(result.artifactBytes + fileStats.size, DATA_LIMITS.stagedData, 'whole artifact stored bytes', true);
    if (path.startsWith('data/')) ceiling(fileStats.size, path === 'data/catalogue.json.gz' ? DATA_LIMITS.catalogueGzip : DATA_LIMITS.sittingGzip, `${path} compressed bytes`, true);
    const bytes = await readFile(join(root, path)); result.artifactBytes += bytes.length; ceiling(result.artifactBytes, DATA_LIMITS.stagedData, 'whole artifact stored bytes', true);
    result.files.push([path, bytes.length, digest(bytes)]);
    if (path.startsWith('icons/')) result.iconBytes += bytes.length;
    else if (!path.startsWith('data/')) result.shellGzip += shellGzip(bytes);
    if (/\.[cm]?js$/.test(path)) result.jsGzip += shellGzip(bytes);
    if (!path.startsWith('data/')) continue;
    requireValue(path === 'data/catalogue.json.gz' || isSitting(path), `unexpected staged data path: ${path}`);
    const decoded = gunzipSync(bytes, { maxOutputLength: DATA_LIMITS.decoded }); ceiling(decoded.length, DATA_LIMITS.decoded, `${path} decoded UTF-8 bytes`, true);
    const json: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded));
    if (path === 'data/catalogue.json.gz') {
      result.catalogueGzip = bytes.length; result.catalogueDecoded = decoded.length;
      try {
        catalogue = validateCatalogue(json);
        result.snapshot = { snapshotId: catalogue.snapshotId, preparedAt: catalogue.preparedAt, publishedAt: catalogue.publishedAt,
          coverage: catalogue.coverage, status: catalogue.status, sittingCount: catalogue.sittings.length };
      } catch { result.sourceVerified = false; }
    } else {
      result.sittings.push({ path, gzip: bytes.length, decoded: decoded.length });
      try {
        requireValue(catalogue, 'validated catalogue required'); let selected;
        for (const sitting of catalogue.sittings) if (sitting.record.path === path) selected = sitting;
        requireValue(selected, 'unreferenced sitting file');
        requireValue(selected.record.digest === digest(decoded) && selected.record.compressedBytes === bytes.length
          && selected.record.decodedBytes === decoded.length, 'descriptor byte/digest mismatch');
        validateSittingRecord(json, selected, catalogue); matched.add(path);
      } catch { result.sourceVerified = false; }
    }
  }
  if (!catalogue) result.sourceVerified = false;
  else for (const sitting of catalogue.sittings) if (sitting.record.path && !matched.has(sitting.record.path)) result.sourceVerified = false;
  result.complete = result.sourceVerified; result.artifactDigest = digest(JSON.stringify(result.files)); return result;
}
/** Recognizes application JS beyond the required worker.
 * @param path Relative asset path.
 * @returns Whether this is application JavaScript.
 */
function isApplicationJs(path: string): boolean { return /\.[cm]?js$/.test(path) && path !== 'sw.js'; }
/** Recognizes a required stylesheet.
 * @param path Relative asset path.
 * @returns Whether this is CSS.
 */
function isCss(path: string): boolean { return path.endsWith('.css'); }
/** Recognizes contract-shaped exact-ID shard paths.
 * @param path Relative data path.
 * @returns Whether this is a sitting shard.
 */
function isSitting(path: string): boolean { return /^data\/sittings\/[1-9]\d*\.json\.gz$/.test(path); }
/** Requires candidate/report evidence outside the deployed hash's file set.
 * @param artifact Absolute artifact root.
 * @param evidence Absolute evidence path.
 * @throws Error for evidence inside the artifact.
 */
function outsideArtifact(artifact: string, evidence: string): void {
  const path = relative(artifact, evidence); requireValue(path === '..' || path.startsWith('../'), 'candidate/report metadata must stay outside artifact');
}
/** Binds supplied measurement evidence to independently measured artifact bytes.
 * @param args Required --artifact, --candidate and --report paths.
 * @returns Resolves after passing or setting a failure exit status.
 * @remarks Reads files, logs results and sets process.exitCode.
 * @throws Error internally for invalid input; caught and reported as exit 1.
 */
async function runCli(args: string[]): Promise<void> {
  try {
    const values: Record<string, string> = {};
    for (let index = 0; index < args.length; index += 2) {
      requireValue(['--artifact', '--candidate', '--report'].includes(args[index]) && args[index + 1], 'Use --artifact <frozen-directory> --candidate <candidate.json> --report <report.json>'); values[args[index]] = args[index + 1];
    }
    requireValue(values['--artifact'] && values['--candidate'] && values['--report'], 'artifact, candidate and complete measured report evidence are required');
    const artifact = resolve(values['--artifact']); const candidatePath = resolve(values['--candidate']); const reportPath = resolve(values['--report']);
    outsideArtifact(artifact, candidatePath); outsideArtifact(artifact, reportPath);
    const candidate: unknown = JSON.parse(await readFile(candidatePath, 'utf8')); requireValue(isCandidate(candidate), 'valid independently supplied candidate required');
    const report = object(JSON.parse(await readFile(reportPath, 'utf8')), 'performance report evidence');
    const measured = await measureArtifact(artifact); requireValue(measured.artifactDigest === candidate.artifactDigest, 'measured artifact digest differs from frozen candidate');
    requireValue(measured.sourceVerified && measured.snapshot?.snapshotId === candidate.snapshotId, 'complete source-verified candidate snapshot required');
    const sizes = object(report.sizes, 'reported measured sizes');
    for (const key of ['shellGzip', 'jsGzip', 'iconBytes', 'artifactBytes', 'catalogueGzip', 'catalogueDecoded', 'complete', 'layoutComplete', 'sourceVerified'] as const) requireValue(sizes[key] === measured[key], `reported measured sizes differ: ${key}`);
    requireValue(JSON.stringify(sizes.sittings) === JSON.stringify(measured.sittings), 'reported measured sizes differ: sitting files/bytes');
    const coverage = object(report.sourceCoverage, 'full-source coverage');
    requireValue(coverage.accounted === measured.snapshot.sittingCount && coverage.availableRecords === measured.sittings.length, 'measured source coverage differs from report');
    const fileHashes = new Map<string, string>(); for (const [path, , hash] of measured.files) fileHashes.set(path, hash);
    for (const [path, hash] of Object.entries(candidate.fixtureHashes)) requireValue(fileHashes.get(path) === hash, 'measured frozen fixture digest mismatch');
    report.expectedCandidate = candidate; report.expectedRepository = process.env.GITHUB_REPOSITORY ?? 'eaglecheow/vote-better-malaysia'; report.now = new Date().toISOString();
    evaluateBudgets(report);
    console.log(`Supplied exact-candidate budgets/report conditions pass; field mobile=${report.field.mobile}, desktop=${report.field.desktop}. Report authenticity/physical execution require reviewed trusted provenance; this is not field-CWV proof.`);
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
if (import.meta.main) await runCli(process.argv.slice(2));
