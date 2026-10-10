import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

type Mapping = Record<string, any>;

/** Reads actual CI configuration, with absence represented as missing behavior.
 * @returns Parsed workflow or an empty mapping before implementation.
 * @throws On malformed YAML or unavailable Ruby; neither is behavioral RED.
 * @remarks Reads the checkout and starts only its installed YAML parser.
 */
function workflow(): Mapping {
  const path = resolve('.github/workflows/ci.yml');
  return existsSync(path) ? JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e',
    'puts JSON.generate(YAML.safe_load(File.read(ARGV[0]), aliases: false))', path], { encoding: 'utf8' })) : {};
}
const configuration = workflow();
const required = {
  unit: 'Hansard type and unit', production: 'Hansard production and browser',
  review: 'Hansard RED and source review', size: 'Hansard size budgets',
  laboratory: 'Hansard laboratory budgets', targets: 'Hansard actual targets',
  documentation: 'Hansard documentation',
};

/** Selects one real role without missing-node exceptions.
 * @param role Required job identifier.
 * @returns Actual role or an empty mapping.
 */
function job(role: string): Mapping { return configuration.jobs?.[role] ?? {}; }

/** Collects actual executable command bodies for semantic configuration assertions.
 * @param role Required job identifier.
 * @returns All shell bodies in execution order, or empty text.
 */
function commands(role: string): string {
  const bodies: string[] = [];
  for (const step of job(role).steps ?? []) if (typeof step.run === 'string') bodies.push(step.run);
  return bodies.join('\n');
}

/** Finds an actual archive upload by its stable provider role.
 * @param role Required job identifier.
 * @param name Fixed artifact role.
 * @returns Actual upload step or an empty mapping before implementation.
 */
function upload(role: string, name: string): Mapping {
  for (const step of job(role).steps ?? []) if (step.uses?.startsWith('actions/upload-artifact@') && step.with?.name === name) return step;
  return {};
}

test('CI-WF001: every PR retriggers gates without path or branch filters',
  /** Checks missing evidence commits cannot skip required checks. @returns Nothing after assertions. */
  () => { expect.soft(configuration.on && Object.hasOwn(configuration.on, 'pull_request')).toBe(true); expect.soft(configuration.on?.pull_request).toBeNull(); });

test('CI-WF002: candidate preparation requires manual dispatch',
  /** Checks CI candidate work has a separate explicit trigger. @returns Nothing after assertions. */
  () => { expect.soft(configuration.on && Object.hasOwn(configuration.on, 'workflow_dispatch')).toBe(true); expect.soft(commands('prepare')).toContain('scripts/ci-inputs.ts prepare'); });

test('CI-WF003: the complete CI workflow has only repository and artifact read permissions',
  /** Checks no privileged PR execution/publication authority. @returns Nothing after assertions. */
  () => { expect.soft(configuration.permissions).toEqual({ contents: 'read', actions: 'read' }); expect.soft(configuration.on?.pull_request_target).toBeUndefined(); });

for (const [role, name] of Object.entries(required)) test(`CI-WF004 ${role}: required status name exists on every PR`,
  /** Checks an actual stable required status and ordinary PR execution.
   * @returns Nothing after assertions.
   */
  () => { expect.soft(job(role).name).toBe(name); expect.soft(job(role).if ?? '').toContain("github.event_name == 'pull_request'"); });

for (const role of ['production', 'review', 'size', 'laboratory', 'targets', 'documentation']) test(`CI-WF005 ${role}: upstream failure still executes a rejecting required gate`,
  /** Checks skipped upstream inputs cannot become a successful required status.
   * @returns Nothing after assertions.
   */
  () => { expect.soft(job(role).if ?? '').toContain('always()'); expect.soft(job(role).needs ?? []).toContain('inputs'); expect.soft(commands(role)).toContain('needs.inputs.result'); expect.soft(commands(role)).toContain('exit 1'); });

test('CI-WF006: type and all unit suites run under the locked install',
  /** Checks reproducible commands and no intentionally omitted test selection. @returns Nothing after assertions. */
  () => { expect.soft(commands('unit')).toContain('npm ci'); expect.soft(commands('unit')).toContain('npm run typecheck'); expect.soft(commands('unit')).toContain('npm test -- --run'); });

test('CI-WF007: native production browser checks retain all three engines and original frozen bytes',
  /** Checks independent frozen-artifact invocation and engine availability. @returns Nothing after assertions. */
  () => { expect.soft(commands('production')).toContain('playwright install --with-deps chromium firefox webkit'); expect.soft(commands('production')).toContain('HANSARD_FROZEN_SITE'); expect.soft(commands('production')).toContain('npm run test:browser'); });

test('CI-WF008: selected immutable CI inputs are authenticated rather than rebuilding on report-only reuse',
  /** Checks the concrete runtime input verifier and reviewed locator. @returns Nothing after assertions. */
  () => { expect.soft(commands('inputs')).toContain('scripts/ci-inputs.ts verify'); expect.soft(commands('inputs')).toContain('ci-inputs.json'); expect.soft(commands('inputs')).not.toContain('npm run build'); });

for (const role of ['size', 'laboratory', 'targets']) test(`CI-WF009 ${role}: complete performance evidence is required without partial-pass mode`,
  /** Checks all candidate/device budgets use the existing strict checker.
   * @returns Nothing after assertions.
   */
  () => { expect.soft(commands(role)).toContain('npm run test:performance'); expect.soft(commands(role)).toContain('--candidate'); expect.soft(commands(role)).toContain('--report'); });

test('CI-WF010: documentation evaluates the current checkout against the matching review report',
  /** Checks current-file review instead of fixture or stale candidate-document claims. @returns Nothing after assertions. */
  () => { expect.soft(commands('documentation')).toContain('npm run check:docs'); expect.soft(commands('documentation')).toContain('--root .'); expect.soft(commands('documentation')).toContain('--report'); });

test('CI-WF011: CI preparation has explicit non-PR execution and the defined laboratory runner class',
  /** Checks publication state cannot be emitted by ordinary PR jobs. @returns Nothing after assertions. */
  () => { expect.soft(job('prepare').if ?? '').toContain("github.event_name == 'workflow_dispatch'"); expect.soft(job('prepare')['runs-on']).toBe('ubuntu-24.04'); expect.soft(commands('prepare')).toContain('npm run performance:collect'); });

test('CI-WF012: all action versions are immutable and CI has no Pages deploy/write role',
  /** Checks real action references and inherited permissions, without claiming remote enforcement. @returns Nothing after assertions. */
  () => {
    const references: string[] = [];
    for (const role of Object.values(configuration.jobs ?? {}) as Mapping[]) {
      for (const step of role.steps ?? []) if (typeof step.uses === 'string') references.push(step.uses);
      expect.soft(role.permissions?.pages).not.toBe('write'); expect.soft(role.permissions?.['id-token']).not.toBe('write'); expect.soft(role.environment).toBeUndefined();
    }
    expect.soft(references.length).toBeGreaterThan(0);
    for (const reference of references) { expect.soft(reference).toMatch(/@[a-f0-9]{40}$/); expect.soft(reference).not.toContain('deploy-pages'); }
  });

test('CI-WF013: every PR gate explicitly checks out the actual PR head independently of the merge SHA',
  /** Checks the workflow supplies the real checkout identity required by runtime provenance.
   * @returns Nothing after actual configuration assertions.
   */
  () => {
    for (const role of ['inputs', ...Object.keys(required)]) {
      let ref: unknown;
      for (const step of job(role).steps ?? []) if (step.uses?.startsWith('actions/checkout@')) ref = step.with?.ref;
      expect.soft(ref).toBe('${{ github.event.pull_request.head.sha }}');
    }
  });

test('CI-WF014: manual preparation resolves the open PR head/base and restricts its producer to main',
  /** Checks provider-derived tested context remains separate from the executing workflow revision.
   * @returns Nothing after actual configuration assertions.
   */
  () => {
    expect.soft(job('prepare').if ?? '').toContain("github.ref == 'refs/heads/main'");
    expect.soft(commands('prepare')).toContain('pulls/$HANSARD_PR_NUMBER');
    expect.soft(commands('prepare')).toContain('.head.sha');
    expect.soft(commands('prepare')).toContain('.base.sha');
    let resolved = false;
    for (const step of job('prepare').steps ?? []) if (step.uses?.startsWith('actions/checkout@') && step.with?.ref === '${{ steps.context.outputs.head_revision }}') resolved = true;
    expect.soft(resolved).toBe(true);
  });

test('CI-WF015: preparation serializes measurements in one repository laboratory allocation without cancellation',
  /** Checks independently dispatched lab runs cannot overlap or cancel valid measurements.
   * @returns Nothing after actual concurrency assertions.
   */
  () => {
    expect.soft(job('prepare').concurrency?.group ?? '').toContain('github.repository');
    expect.soft(job('prepare').concurrency?.['cancel-in-progress']).toBe(false);
  });

test('CI-WF016: original candidate and laboratory archives retain complete bytes and seven-day evidence',
  /** Checks named immutable role uploads include hidden files and fail on missing files.
   * @returns Nothing after actual archive policy assertions.
   */
  () => {
    for (const name of ['hansard-ci-candidate', 'hansard-ci-lab']) {
      const step = upload('prepare', name);
      expect.soft(step.with?.['retention-days']).toBe(7);
      expect.soft(step.with?.['include-hidden-files']).toBe(true);
      expect.soft(step.with?.['if-no-files-found']).toBe('error');
    }
  });

test('CI-WF017: lab provenance binds actual uploaded candidate identity and actual producer/checkout context',
  /** Checks unavailable artifact IDs cannot be fabricated before the candidate upload.
   * @returns Nothing after actual workflow data-flow assertions.
   */
  () => {
    let origin: Mapping = {};
    for (const step of job('prepare').steps ?? []) if (typeof step.run === 'string' && step.run.includes('candidateArtifact')) origin = step;
    expect.soft(origin.env?.CANDIDATE_ARTIFACT_ID).toBe('${{ steps.candidate-upload.outputs.artifact-id }}');
    expect.soft(origin.env?.CANDIDATE_ARCHIVE_DIGEST).toBe('${{ steps.candidate-upload.outputs.artifact-digest }}');
    for (const actual of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SHA', 'git rev-parse HEAD', '.candidate']) expect.soft(origin.run ?? '').toContain(actual);
  });

test('CI-WF018: native laboratory collection serves the frozen candidate at an actual local preview origin',
  /** Checks an upload or physical-report HTTPS setting cannot substitute for a running measured site.
   * @returns Nothing after actual preview/collection configuration assertions.
   */
  () => {
    expect.soft(commands('prepare')).toContain('node node_modules/vite/bin/vite.js preview');
    expect.soft(commands('prepare')).toContain('--outDir "$HANSARD_CI_WORK/candidate/site"');
    expect.soft(commands('prepare')).toContain('--host 127.0.0.1');
    expect.soft(commands('prepare')).toContain('http://127.0.0.1:4173/vote-better-malaysia/');
    expect.soft(commands('prepare')).toContain('--url "$lab_url"');
  });
