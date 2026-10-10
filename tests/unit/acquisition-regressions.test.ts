import { afterEach, expect, test, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { stageSnapshot, type AcquisitionOptions } from '../../scripts/acquire.ts';
import { readerFixture, type ReaderFixture } from '../fixtures/reader.ts';

const fault = vi.hoisted(/** Creates only isolated fault-control bindings. @returns Disabled exact-path cleanup fault state. */ () => ({ target: null as string | null, attempts: 0 }));
vi.mock('node:fs/promises',
  /** Installs one narrow cleanup failure while retaining actual native filesystem behavior. @returns Native filesystem exports with one forwarding rm wrapper. @throws Propagates module import failure. */
  async () => {
    const native = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    return { ...native, rm: remove };
    /**
     * Injects EACCES only at the selected temporary partial-checkpoint cleanup path.
     * @param path Requested native removal path.
     * @param options Native removal options.
     * @returns Completion of the native removal for every other path.
     * @throws Explicit controlled EACCES or native filesystem errors.
     * @remarks Counts only this test's targeted cleanup attempt; all other I/O is forwarded unchanged.
     */
    async function remove(path: Parameters<typeof native.rm>[0], options?: Parameters<typeof native.rm>[1]): Promise<void> {
      if (typeof path === 'string' && path === fault.target) { fault.attempts++; throw Object.assign(new Error('Controlled EACCES removing completed partial checkpoint'), { code: 'EACCES' }); }
      await native.rm(path, options);
    }
  });

interface Disk { root: string; state: string; out: string }
interface Attempt { rejected: boolean; error: unknown; result: Awaited<ReturnType<typeof stageSnapshot>> | null }
const scratch: string[] = [];

/** Cleans only isolated test directories after disabling the targeted fault. @returns Completion after actual native cleanup. @throws Propagates unexpected cleanup failures. @remarks Resets local fault state and removes these tests' temporary files. */
async function cleanup(): Promise<void> { fault.target = null; fault.attempts = 0; for (const root of scratch.splice(0)) await rm(root, { recursive: true, force: true }); }
afterEach(cleanup);

/** Allocates a fresh real temporary output/private-state pair. @returns Isolated native filesystem paths. @throws Propagates temporary directory creation errors. @remarks Adds this test directory to the cleanup collection. */
async function disk(): Promise<Disk> { const root = await mkdtemp(join(tmpdir(), 'hansard-commit-regression-')); scratch.push(root); return { root, state: join(root, 'state'), out: join(root, 'out') }; }

/** Supplies honest controlled development staging metadata. @param value Isolated native filesystem paths. @returns Exact local-only staging options. */
function options(value: Disk): AcquisitionOptions { return { state: value.state, out: value.out, mode: 'bootstrap', repository: 'eaglecheow/vote-better-malaysia', branch: 'controlled-regression', codeFingerprint: 'a'.repeat(64), workflowContext: false, now }; }
/** Supplies only a controlled private preparation clock. @returns UTC milliseconds after all controlled source metadata. */
function now(): number { return Date.parse('2026-10-10T05:00:00.000Z'); }

/** Stages a complete validated controlled snapshot using native filesystem operations. @param value Isolated paths. @param fixture Complete controlled catalogue/shard bytes. @returns Real staging outcome. @throws Propagates actual stageSnapshot validation/commit failures. @remarks Writes only the caller's allocated temporary directory. */
async function stage(value: Disk, fixture: ReaderFixture): Promise<Awaited<ReturnType<typeof stageSnapshot>>> { return stageSnapshot(fixture.catalogue, new Map([['29326', fixture.recordGzip!]]), options(value)); }

/** Observes the actual stage result without hiding a cleanup/commit failure. @param value Isolated paths. @param fixture Candidate complete controlled data. @returns Success result or captured rejection. @remarks Performs actual staging only within this test's temporary directory. */
async function attempt(value: Disk, fixture: ReaderFixture): Promise<Attempt> {
  try { return { rejected: false, error: null, result: await stage(value, fixture) }; }
  catch (error) { return { rejected: true, error, result: null }; }
}

/** Reads a native file or reports genuine absence. @param path Isolated file path. @returns Exact file bytes or null only for ENOENT. @throws Propagates every other filesystem error. */
async function optional(path: string): Promise<Buffer | null> { try { return await readFile(path); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; } }

/** Creates the exact cleanup target after staging prerequisites are ready. @param value Isolated paths. @returns Completion after enabling the narrow EACCES fault. @throws Propagates temporary setup errors. @remarks Writes only a synthetic private pending-work marker and sets local fault state. */
async function cleanupFault(value: Disk): Promise<void> { await mkdir(value.state, { recursive: true }); const path = join(value.state, 'partial-checkpoint.json'); await writeFile(path, JSON.stringify({ kind: 'controlled-pending-private-work' })); fault.target = path; fault.attempts = 0; }

/**
 * Requires a reported staging rejection to preserve the complete previous public/checkpoint pair.
 * @returns Completion after exact old catalogue, shard and checkpoint byte preservation.
 * @throws Propagates genuine fixture/setup/native read errors.
 * @remarks Uses real temporary files; injects only the post-checkpoint partial-cleanup rm failure.
 */
async function preservesAcceptedPair(): Promise<void> {
  const value = await disk(); const previous = readerFixture(); previous.catalogue.snapshotId = 'controlled-prior-complete-snapshot'; await stage(value, previous);
  const oldCatalogue = await readFile(join(value.out, 'catalogue.json.gz')); const oldShard = await readFile(join(value.out, 'sittings', '29326.json.gz')); const oldCheckpoint = await readFile(join(value.state, 'checkpoint.json'));
  const candidate = readerFixture('ready'); candidate.catalogue.snapshotId = 'controlled-new-complete-snapshot'; await cleanupFault(value);
  const result = await attempt(value, candidate);
  const catalogue = await optional(join(value.out, 'catalogue.json.gz')); const shard = await optional(join(value.out, 'sittings', '29326.json.gz')); const checkpoint = await optional(join(value.state, 'checkpoint.json'));
  expect({ rejected: result.rejected, targetedCleanupAttempts: fault.attempts, catalogueUnchanged: catalogue?.equals(oldCatalogue) ?? false, shardUnchanged: shard?.equals(oldShard) ?? false, checkpointUnchanged: checkpoint?.equals(oldCheckpoint) ?? false }).toEqual({ rejected: true, targetedCleanupAttempts: 1, catalogueUnchanged: true, shardUnchanged: true, checkpointUnchanged: true });
}
test('COMMIT-RETAINED: cleanup failure after checkpoint replacement preserves the previous complete accepted public/private pair on rejection', preservesAcceptedPair);

/**
 * Checks a first candidate's observed pair and explicit result instead of allowing half a commit.
 * @returns Completion after absent-or-complete coherence and truthful result assertions.
 * @throws Propagates genuine fixture/setup/native decoding errors.
 * @remarks Uses real temporary output/state; only the exact cleanup rm call is faulted.
 */
async function preservesFirstPairCoherence(): Promise<void> {
  const value = await disk(); const candidate = readerFixture('ready'); candidate.catalogue.snapshotId = 'controlled-first-complete-snapshot'; await cleanupFault(value);
  const result = await attempt(value, candidate); const publicBytes = await optional(join(value.out, 'catalogue.json.gz')); const checkpointBytes = await optional(join(value.state, 'checkpoint.json')); const shard = await optional(join(value.out, 'sittings', '29326.json.gz'));
  const absent = publicBytes === null && checkpointBytes === null && shard === null;
  let complete = false;
  if (publicBytes !== null && checkpointBytes !== null && shard !== null) {
    const catalogue = JSON.parse(gunzipSync(publicBytes).toString()); const checkpoint = JSON.parse(checkpointBytes.toString());
    complete = catalogue.snapshotId === candidate.catalogue.snapshotId && JSON.stringify(checkpoint.catalogue) === JSON.stringify(catalogue) && checkpoint.catalogueDigest === createHash('sha256').update(gunzipSync(publicBytes)).digest('hex') && shard.equals(Buffer.from(candidate.recordGzip!));
  }
  const reportedCommit = result.result?.catalogue.snapshotId === candidate.catalogue.snapshotId || result.error !== null && typeof result.error === 'object' && 'committed' in result.error && result.error.committed === true && 'snapshotId' in result.error && result.error.snapshotId === candidate.catalogue.snapshotId;
  expect({ targetedCleanupAttempts: fault.attempts, coherentPair: absent || complete, truthfulResult: absent ? result.rejected : complete && reportedCommit }).toEqual({ targetedCleanupAttempts: 1, coherentPair: true, truthfulResult: true });
}
test('COMMIT-FIRST: failed first staging leaves both resources absent or a complete consistently reported commit, never a split pair', preservesFirstPairCoherence);
