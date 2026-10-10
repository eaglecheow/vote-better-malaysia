// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

type Mapping = Record<string, any>;

/** Reads the actual preview workflow, representing an absent workflow as missing behavior.
 * @returns Parsed workflow or an empty mapping before implementation.
 * @throws On malformed YAML or unavailable Ruby, which are harness failures rather than RED.
 * @remarks Reads the checkout and starts only its installed YAML parser.
 */
function workflow(): Mapping {
  const path = resolve('.github/workflows/pages-preview.yml');
  return existsSync(path) ? JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e',
    'puts JSON.generate(YAML.safe_load(File.read(ARGV[0]), aliases: false))', path], { encoding: 'utf8' })) : {};
}
const configuration = workflow();

/** Selects one workflow job without missing-node exceptions.
 * @param role Required job identifier.
 * @returns Actual job or an empty mapping before implementation.
 */
function job(role: string): Mapping { return configuration.jobs?.[role] ?? {}; }

/** Selects one stable prerequisite or deployment step.
 * @param role Workflow job.
 * @param id Required step identifier.
 * @returns Actual step or an empty mapping before implementation.
 */
function step(role: string, id: string): Mapping {
  for (const entry of job(role).steps ?? []) if (entry.id === id) return entry;
  return {};
}

test('PREVIEW-WF001: public preview is manually dispatched from main with no automatic deployment trigger',
  /** Checks publication consent and guarded source identity. @returns Nothing after assertions. */
  () => {
    expect(Object.keys(configuration.on ?? {})).toEqual(['workflow_dispatch']);
    for (const role of ['build', 'deploy']) {
      expect(job(role).if ?? '').toContain("github.event_name == 'workflow_dispatch'");
      expect(job(role).if ?? '').toContain("github.ref == 'refs/heads/main'");
    }
    expect(step('build', 'checkout').with?.ref).toBe('${{ github.sha }}');
  });

test('PREVIEW-WF002: only a successful build receives the minimum Pages deployment authority',
  /** Checks failing acquisition/checks cannot deploy, and private state is not an upload. @returns Nothing after assertions. */
  () => {
    expect(configuration.permissions).toEqual({ contents: 'read' });
    expect(job('deploy').permissions).toEqual({ pages: 'write', 'id-token': 'write' });
    expect(job('build').permissions?.pages).not.toBe('write');
    expect(job('deploy').needs).toEqual(['build']);
    expect(job('deploy').if ?? '').toContain("needs.build.result == 'success'");
    expect(job('deploy').environment?.name).toBe('github-pages');
    expect(step('build', 'upload').with?.path).toBe('dist');
    expect(step('deploy', 'deployment').with?.artifact_name).toBe('github-pages');
    for (const role of ['build', 'deploy']) for (const entry of job(role).steps ?? []) expect(entry['continue-on-error']).toBeUndefined();
  });

test('PREVIEW-WF003: the preview runs the locked Node 24 unit and browser prerequisites before publication',
  /** Checks exact built bytes are browser-tested after official bootstrap. @returns Nothing after assertions. */
  () => {
    expect(step('build', 'node').with?.['node-version-file']).toBe('.nvmrc');
    expect(readFileSync('.nvmrc', 'utf8').trim()).toMatch(/^24/);
    expect(step('build', 'dependencies').run).toBe('npm ci');
    expect(step('build', 'browsers').run).toBe('npx playwright install --with-deps chromium firefox webkit');
    expect(step('build', 'unit').run ?? '').toContain('npm run typecheck');
    expect(step('build', 'unit').run ?? '').toContain('npm test -- --run');
    expect(step('build', 'acquire').run).toBe('npm run data:acquire -- --mode bootstrap --state .cache/hansard-preview --out public/data');
    expect(step('build', 'build').run).toBe('npm run build');
    expect(step('build', 'browser').env?.HANSARD_FROZEN_SITE).toBe('${{ github.workspace }}/dist');
    expect(step('build', 'browser').run).toBe('npm run test:browser');
    const ids: string[] = [];
    for (const entry of job('build').steps ?? []) ids.push(entry.id);
    for (const [before, after] of [['dependencies', 'browsers'], ['browsers', 'unit'], ['unit', 'acquire'], ['acquire', 'build'], ['build', 'sizes'], ['sizes', 'browser'], ['browser', 'upload']]) {
      expect(ids.indexOf(before)).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf(after)).toBeGreaterThan(ids.indexOf(before));
    }
  });

test('PREVIEW-WF004: the full-source artifact is size-checked without claiming release reports',
  /** Checks shared validation, complete accounting and the existing shell/JS/icon ceilings. @returns Nothing after assertions. */
  () => {
    const command = step('build', 'sizes').run ?? '';
    for (const required of ['measureArtifact', 'sizes.complete', 'sizes.layoutComplete', 'sizes.sourceVerified', 'sizes.snapshot.coverage.latestInventoryCount', 'sizes.snapshot.sittingCount', 'sizes.snapshot.coverage.unavailableSittingCount', '153600', '102400', '61440']) expect(command).toContain(required);
    expect(command).not.toMatch(/evaluateBudgets|candidate\.json|performance\.json|documentation\.json|publication\.ts/);
    expect(job('build')['timeout-minutes']).toBe(270);
  });

test('PREVIEW-WF005: preview and full-release deployments serialize and use immutable action versions',
  /** Checks shared concurrency and pinned provider actions. @returns Nothing after assertions. */
  () => {
    expect(configuration.concurrency).toEqual({ group: 'hansard-pages-${{ github.repository }}', 'cancel-in-progress': false });
    const references: string[] = [];
    for (const role of ['build', 'deploy']) for (const entry of job(role).steps ?? []) if (entry.uses) references.push(entry.uses);
    expect(references.length).toBe(4);
    for (const reference of references) expect(reference).toMatch(/@[a-f0-9]{40}$/);
    expect(step('build', 'upload').uses ?? '').toContain('actions/upload-pages-artifact@');
    expect(step('deploy', 'deployment').uses ?? '').toContain('actions/deploy-pages@');
  });

test('PREVIEW-UI001: a persistent bilingual preview notice survives app rendering and discloses incomplete checks',
  /** Checks static reader-independent preview content and language attribution. @returns Nothing after assertions. */
  () => {
    const document = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html');
    const notice = document.querySelector('#public-preview');
    expect(notice).not.toBeNull();
    expect(document.querySelector('#app')?.contains(notice)).toBe(false);
    expect(notice?.getAttribute('aria-label')).toBe('Pratonton awam / Public preview');
    expect(notice?.textContent ?? '').toContain('Pratonton awam');
    expect(notice?.querySelector('[lang="ms"]')?.textContent ?? '').toContain('Pratonton awam');
    expect(notice?.querySelector('[lang="en"]')?.textContent ?? '').toContain('Public preview');
    expect(notice?.querySelector('[lang="en"]')?.textContent ?? '').toContain('Device, accessibility and source reuse permission checks are incomplete.');
  });
