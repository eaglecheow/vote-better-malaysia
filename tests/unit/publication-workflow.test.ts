import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

type Mapping = Record<string, any>;

/** Parses the actual workflow with Ruby's installed YAML parser, without executing jobs.
 * @returns The complete parsed workflow configuration.
 * @throws On invalid YAML or an unavailable parser, which is a harness failure rather than RED.
 * @remarks Reads only the tracked workflow; starts a local parser subprocess.
 */
function workflow(): Mapping {
  return JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e',
    'puts JSON.generate(YAML.safe_load(File.read(ARGV[0]), aliases: false))',
    resolve('.github/workflows/pages.yml')], { encoding: 'utf8' }));
}
const configuration = workflow();

/** Reads a required role without missing-node exceptions masking a configuration assertion.
 * @param name Required workflow job role.
 * @returns The parsed role, or an empty object for missing behavior.
 */
function job(name: string): Mapping { return configuration.jobs?.[name] ?? {}; }

/** Reads a role's ordered steps for transport and command assertions.
 * @param name Required workflow job role.
 * @returns Actual steps, or an empty list for missing behavior.
 */
function steps(name: string): Mapping[] { return job(name).steps ?? []; }

/** Finds a stable step boundary used by the workflow's outputs and conditional gates.
 * @param role Job role.
 * @param id Stable step identifier.
 * @returns Its actual configuration, or an empty object for missing behavior.
 */
function step(role: string, id: string): Mapping {
  for (const value of steps(role)) if (value.id === id) return value;
  return {};
}

/** Collects every actual action reference without assuming the expected jobs exist.
 * @returns Complete workflow action references.
 */
function actions(): string[] {
  const result: string[] = [];
  for (const value of Object.values(configuration.jobs ?? {}) as Mapping[]) {
    for (const entry of value.steps ?? []) if (typeof entry.uses === 'string') result.push(entry.uses);
  }
  return result;
}

test('PUB-WF001: the reviewed workflow runs exactly at minute 17 every four UTC hours',
  /** Checks the real schedule, independently of any local fixture clock. @returns Nothing after assertions. */
  () => { expect(configuration.on?.schedule).toEqual([{ cron: '17 */4 * * *' }]); });

test('PUB-WF002: manual dispatch distinguishes preparation, report collection and explicit promotion',
  /** Checks concrete dispatch choices. @returns Nothing after assertions. */
  () => { expect(configuration.on?.workflow_dispatch?.inputs?.operation).toMatchObject({ type: 'choice', default: 'prepare', options: ['prepare', 'evidence', 'promote'] }); });

for (const name of ['candidate_run_id', 'evidence_run_id']) test('PUB-WF003: manual promotion names ' + name,
  /** Checks explicit artifact-producing run input without a trust override.
   * @returns Nothing after the input assertion.
   */
  () => { expect(configuration.on?.workflow_dispatch?.inputs?.[name]).toMatchObject({ type: 'string', required: false }); });

test('PUB-WF004: the candidate job rejects non-main execution',
  /** Checks the outer reviewed-default-branch boundary; runtime authentication is separately tested. @returns Nothing after assertions. */
  () => { expect(job('candidate').if).toBe("github.ref == 'refs/heads/main'"); });

test('PUB-WF005: one repository concurrency group keeps an active publication running',
  /** Checks lock scope and explicit noncancellation. @returns Nothing after assertions. */
  () => {
    expect.soft((configuration.concurrency?.group ?? '')).toContain('${{ github.repository }}');
    expect.soft(configuration.concurrency?.['cancel-in-progress']).toBe(false);
  });

test('PUB-WF006: job timeouts bound acquisition plus checks and deployment finalization',
  /** Checks finite workflow caps in addition to the independently tested four-hour acquisition cap. @returns Nothing after assertions. */
  () => {
    expect.soft(job('candidate')['timeout-minutes']).toBe(270);
    expect.soft(job('deploy')['timeout-minutes']).toBe(15);
    expect.soft(job('finish')['timeout-minutes']).toBe(15);
  });

test('PUB-WF007: ordinary candidate work receives only repository and artifact read permissions',
  /** Checks no write permission is inherited by acquisition or report validation. @returns Nothing after assertions. */
  () => { expect(configuration.permissions).toEqual({ contents: 'read', actions: 'read' }); });

test('PUB-WF008: Pages and identity-token writes are confined to the deployment job',
  /** Checks the actual privileged role. @returns Nothing after assertions. */
  () => {
    expect(job('deploy').permissions).toEqual({ contents: 'read', actions: 'read', pages: 'write', 'id-token': 'write' });
    for (const name of ['candidate', 'finish']) {
      expect.soft(job(name).permissions?.pages).not.toBe('write');
      expect.soft(job(name).permissions?.['id-token']).not.toBe('write');
    }
  });

test('PUB-WF009: only the deployment job enters the github-pages environment',
  /** Checks finalization can observe the completed environment deployment instead of waiting on itself. @returns Nothing after assertions. */
  () => {
    expect(job('deploy').environment?.name).toBe('github-pages');
    expect.soft(job('candidate').environment).toBeUndefined(); expect.soft(job('finish').environment).toBeUndefined();
  });

test('PUB-WF010: scheduled and manual preparation call the real preparation controller',
  /** Checks the preparation command and its mode condition. @returns Nothing after assertions. */
  () => {
    expect.soft(step('candidate', 'prepare').run).toBe('node scripts/publication.ts prepare');
    expect.soft(step('candidate', 'prepare').if).toBe("github.event_name == 'schedule' || inputs.operation == 'prepare'");
  });

test('PUB-WF011: explicit promotion validates the original candidate without building or acquiring',
  /** Checks a separate real promotion command. @returns Nothing after assertions. */
  () => {
    expect.soft(step('candidate', 'promote').run).toBe('node scripts/publication.ts promote');
    expect.soft((step('candidate', 'promote').if ?? '')).toContain("inputs.operation == 'promote'");
    expect.soft(step('candidate', 'promote').run ?? '').not.toMatch(/data:acquire|npm run build/);
  });

test('PUB-WF012: untrusted run input is passed through environment values rather than shell source',
  /** Checks actual input transport and absence of inline expression injection. @returns Nothing after assertions. */
  () => {
    expect.soft(job('candidate').env?.HANSARD_CANDIDATE_RUN_ID).toBe('${{ inputs.candidate_run_id }}');
    expect.soft(job('candidate').env?.HANSARD_EVIDENCE_RUN_ID).toBe('${{ inputs.evidence_run_id }}');
    for (const entry of steps('candidate')) expect.soft(entry.run ?? '').not.toMatch(/\$\{\{\s*inputs\./);
  });

test('PUB-WF013: promotion resolves exact immutable artifact IDs before transport',
  /** Checks API-derived ID outputs, not booleans supplied by downloaded JSON. @returns Nothing after assertions. */
  () => {
    const command = step('candidate', 'resolve-artifacts').run ?? '';
    expect.soft((command ?? '')).toContain('gh api');
    expect.soft((command ?? '')).toContain('HANSARD_CANDIDATE_RUN_ID');
    expect.soft((command ?? '')).toContain('HANSARD_EVIDENCE_RUN_ID');
    expect.soft((command ?? '')).toContain('GITHUB_OUTPUT');
  });

for (const id of ['download-candidate', 'download-pages', 'download-evidence']) test('PUB-WF014: ' + id + ' checks an exact cross-run artifact digest',
  /** Checks concrete authenticated download settings. @returns Nothing after assertions. */
  () => {
    const value = step('candidate', id);
    expect.soft(value.uses).toBe('actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333');
    expect.soft((value.with?.['artifact-ids'] ?? '')).toContain('steps.resolve-artifacts.outputs.');
    expect.soft(value.with?.['digest-mismatch']).toBe('error');
    expect.soft(value.with?.['github-token']).toBe('${{ github.token }}');
    expect.soft(value.with?.repository).toBe('${{ github.repository }}');
    expect.soft(value.with?.['run-id']).toBeDefined();
  });

test('PUB-WF015: candidate metadata is retained outside the deployed file directory',
  /** Checks the external metadata transport paths. @returns Nothing after assertions. */
  () => {
    const value = step('candidate', 'upload-candidate');
    expect.soft(value.with?.name).toBe('hansard-candidate');
    expect.soft((value.with?.path ?? '')).toContain('candidate.json');
    expect.soft(value.with?.path ?? '').not.toContain('/artifact/');
    expect.soft(value.with?.['retention-days']).toBe(7);
  });

test('PUB-WF016: frozen Pages candidate transport is explicitly kept seven days',
  /** Checks the nonproduction candidate upload. @returns Nothing after assertions. */
  () => {
    const value = step('candidate', 'freeze-pages');
    expect.soft(value.uses).toBe('actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b');
    expect.soft(value.with?.name).toBe('hansard-pages-candidate');
    expect.soft(value.with?.['retention-days']).toBe(7);
  });

test('PUB-WF017: pending evidence cannot reach the Pages deployment job',
  /** Checks explicit promotion consent and controller readiness at the deployment boundary. @returns Nothing after assertions. */
  () => {
    expect.soft(job('deploy').if).toBe("github.event_name == 'workflow_dispatch' && inputs.operation == 'promote' && needs.candidate.outputs.outcome == 'ready'");
    expect.soft(job('deploy').needs).toEqual(['candidate']);
  });

test('PUB-WF018: promotion reuploads the original artifact.tar with seven-day retention',
  /** Checks unchanged transport rather than a site build in the privileged role. @returns Nothing after assertions. */
  () => {
    const value = step('candidate', 'upload-promotion');
    expect.soft(value.uses).toBe('actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9');
    expect.soft(value.with?.name).toBe('github-pages');
    expect.soft((value.with?.path ?? '')).toContain('artifact.tar');
    expect.soft(value.with?.['retention-days']).toBe(7);
    for (const entry of steps('deploy')) expect.soft(entry.run ?? '').not.toMatch(/data:acquire|npm run build|tar\s/);
  });

test('PUB-WF019: actual deployment uses the reviewed pinned action without PR previews',
  /** Checks the actual Pages submission action. @returns Nothing after assertions. */
  () => {
    expect.soft(step('deploy', 'deployment').uses).toBe('actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e');
    expect.soft(step('deploy', 'deployment').with?.artifact_name).toBe('github-pages');
    expect.soft(step('deploy', 'deployment').with?.preview ?? false).toBe(false);
  });

test('PUB-WF020: finish runs after both candidate and deployment even when either fails',
  /** Checks always-run started-outcome reporting. @returns Nothing after assertions. */
  () => { expect.soft(job('finish').if).toBe('always()'); expect.soft(job('finish').needs).toEqual(['candidate', 'deploy']); });

test('PUB-WF021: finalization receives real job outcomes and performs the actual receipt controller',
  /** Checks completed-deployment versus not-attempted distinctions. @returns Nothing after assertions. */
  () => {
    expect.soft(step('finish', 'finalize').run).toBe('node scripts/publication.ts finalize');
    expect.soft(job('finish').env?.HANSARD_CANDIDATE_RESULT).toBe('${{ needs.candidate.result }}');
    expect.soft(job('finish').env?.HANSARD_DEPLOY_RESULT).toBe('${{ needs.deploy.result }}');
  });

test('PUB-WF022: private state and reports are uploaded on failure without becoming deployed assets',
  /** Checks explicit always-run private evidence persistence. @returns Nothing after assertions. */
  () => {
    const value = step('finish', 'upload-outcomes');
    expect.soft(value.if).toBe('always()');
    expect.soft(value.with?.name).toBe('hansard-outcomes');
    expect.soft(value.with?.['retention-days']).toBe(7);
    expect.soft((value.with?.path ?? '')).toContain('.cache/hansard');
  });

test('PUB-WF023: missing required prepared files fails the upload',
  /** Checks mandatory evidence transport cannot silently succeed with empty paths. @returns Nothing after assertions. */
  () => {
    expect.soft(step('candidate', 'upload-candidate').with?.['if-no-files-found']).toBe('error');
    expect.soft(step('candidate', 'upload-promotion').with?.['if-no-files-found']).toBe('error');
  });

test('PUB-WF024: all third-party workflow actions are pinned to reviewed immutable revisions',
  /** Checks a nonempty complete action set, without treating an empty scaffold as a pass. @returns Nothing after assertions. */
  () => {
    const references = actions(); expect.soft(references.length).toBeGreaterThan(0);
    for (const reference of references) expect.soft(reference).toMatch(/^[^@]+@[a-f0-9]{40}$/);
  });

test('PUB-WF025: preparation and finalization run Node 24 from the project version file',
  /** Checks reproducible controller runtime rather than relying on the hosted default Node. @returns Nothing after assertions. */
  () => {
    for (const name of ['candidate', 'finish']) {
      const value = step(name, 'node');
      expect.soft(value.uses).toBe('actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38');
      expect.soft(value.with?.['node-version-file']).toBe('.nvmrc');
    }
  });

test('PUB-WF-CONTROL: neither PR triggers nor cancellation nor automatic publication is present in the scaffold',
  /** Preserves already-correct negative controls; these are not new RED evidence. @returns Nothing after assertions. */
  () => {
    expect.soft(configuration.on?.pull_request).toBeUndefined(); expect.soft(configuration.on?.pull_request_target).toBeUndefined();
    expect.soft(configuration.concurrency?.['cancel-in-progress']).not.toBe(true);
    expect.soft(configuration.on?.push).toBeUndefined();
  });

test('PUB-WF026: explicit partial recovery names its producing run without a trust override',
  /** Checks manual recovery input and environment-only transport. @returns Nothing after assertions. */
  () => {
    expect.soft(configuration.on?.workflow_dispatch?.inputs?.resume_run_id).toMatchObject({ type: 'string', required: false });
    expect.soft(job('candidate').env?.HANSARD_RESUME_RUN_ID).toBe('${{ inputs.resume_run_id }}');
  });

test('PUB-WF027: private recovery discovers default-branch successful workflow state independently',
  /** Checks real provider discovery rather than payload origin flags. @returns Nothing after assertions. */
  () => {
    const command = step('candidate', 'resolve-state').run ?? '';
    expect.soft(command).toContain('gh api'); expect.soft(command).toContain('pages.yml');
    expect.soft(command).toContain('branch=main'); expect.soft(command).toContain('status=success');
    expect.soft(command).toContain('hansard-state'); expect.soft(command).toContain('hansard-served');
    expect.soft(command).toContain('GITHUB_OUTPUT');
  });

for (const id of ['download-state', 'download-served', 'download-resume']) test('PUB-WF028: ' + id + ' restores only a concrete independently resolved artifact',
  /** Checks exact cross-run recovery transport; runtime trust and schema checks remain mandatory. @returns Nothing after assertions. */
  () => {
    const value = step('candidate', id);
    expect.soft(value.uses).toBe('actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333');
    expect.soft((value.with?.['artifact-ids'] ?? '')).toContain('steps.resolve-state.outputs.');
    expect.soft(value.with?.['digest-mismatch']).toBe('error');
    expect.soft(value.with?.['github-token']).toBe('${{ github.token }}');
    expect.soft(value.with?.repository).toBe('${{ github.repository }}');
    expect.soft(value.with?.['run-id']).toBeDefined(); expect.soft(value.if).toBeDefined();
  });

test('PUB-WF029: accepted state and partial progress are distinct private artifacts retained seven days',
  /** Checks checkpoint transport includes hidden private paths and never becomes a Pages artifact. @returns Nothing after assertions. */
  () => {
    for (const [id, name] of [['upload-state', 'hansard-state'], ['upload-partial', 'hansard-partial']]) {
      const value = step('candidate', id);
      expect.soft(value.uses).toBe('actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9');
      expect.soft(value.with?.name).toBe(name); expect.soft(value.with?.['retention-days']).toBe(7);
      expect.soft(value.with?.['include-hidden-files']).toBe(true);
      expect.soft(value.if).toBeDefined(); expect.soft(value.with?.path ?? '').not.toContain('/artifact/');
    }
  });

test('PUB-WF030: HTTPS test hosting comes from repository configuration instead of downloaded evidence',
  /** Checks the independent test origin; runtime validates its HTTPS repository subpath and reports. @returns Nothing after assertions. */
  () => { expect(job('candidate').env?.HANSARD_TEST_ORIGIN).toBe('${{ vars.HANSARD_TEST_ORIGIN }}'); });

test('PUB-WF031: finalization restores original candidate metadata and bytes by their actual producing run',
  /** Checks a fresh finish runner receives the frozen artifact without rebuilding. @returns Nothing after assertions. */
  () => {
    for (const id of ['download-candidate', 'download-pages', 'download-acquired-state']) {
      const value = step('finish', id);
      expect.soft(value.uses).toBe('actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333');
      expect.soft((value.with?.['artifact-ids'] ?? '')).toContain('needs.candidate.outputs.');
      expect.soft(value.with?.['run-id']).toBe('${{ needs.candidate.outputs.candidate_run_id }}');
      expect.soft(value.with?.['digest-mismatch']).toBe('error');
      expect.soft(value.with?.['github-token']).toBe('${{ github.token }}');
    }
    expect.soft(step('finish', 'download-acquired-state').with?.path ?? '').toContain('/acquired-state');
  });

test('PUB-WF032: finish receives the actual newly uploaded Pages artifact identity and always attempts finalization',
  /** Checks provider artifact binding and failure-path outcome collection. @returns Nothing after assertions. */
  () => {
    expect.soft(job('candidate').outputs?.pages_artifact_id).toBe('${{ steps.upload-promotion.outputs.artifact-id }}');
    expect.soft(job('finish').env?.HANSARD_PAGES_ARTIFACT_ID).toBe('${{ needs.candidate.outputs.pages_artifact_id }}');
    expect.soft(step('finish', 'finalize').if).toBe('always()');
  });

test('PUB-WF033: only confirmed served state is uploaded separately from the acquired checkpoint',
  /** Checks immutable acquired state is not rewritten with publication facts. @returns Nothing after assertions. */
  () => {
    const value = step('finish', 'upload-served');
    expect.soft(value.uses).toBe('actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9');
    expect.soft(value.with?.name).toBe('hansard-served'); expect.soft(value.with?.['retention-days']).toBe(7);
    expect.soft(value.with?.path ?? '').toContain('served-publication.json');
    expect.soft(value.if ?? '').toContain('finalized');
    for (const entry of steps('finish')) expect.soft(entry.with?.name).not.toBe('hansard-state');
  });

test('PUB-WF034: provider API operations receive the actual runner token without printing it',
  /** Checks real API authentication at both controller roles. @returns Nothing after assertions. */
  () => {
    for (const name of ['candidate', 'finish']) expect.soft(job(name).env?.GH_TOKEN).toBe('${{ github.token }}');
    for (const name of ['candidate', 'finish']) for (const entry of steps(name)) expect.soft(entry.run ?? '').not.toMatch(/(?:echo|printf).*\$(?:GH_TOKEN|GITHUB_TOKEN)/);
  });

test('PUB-WF035: finalization can read provider Pages and environment proof without deployment writes',
  /** Checks permissions required by the authenticated postdeployment API reads. @returns Nothing after assertions. */
  () => { expect(job('finish').permissions).toEqual({ contents: 'read', actions: 'read', pages: 'read', deployments: 'read' }); });

test('PUB-WF036: both controller jobs restore the checkout and locked dependencies before execution',
  /** Checks fresh-runner prerequisites and order for the actual Node controller. @returns Nothing after assertions. */
  () => {
    for (const name of ['candidate', 'finish']) {
      const entries = steps(name);
      expect.soft(step(name, 'checkout').uses).toBe('actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803');
      expect.soft(step(name, 'dependencies').run).toBe('npm ci');
      const ids = entries.map(
        /** Reads stable step ordering without executing a job. @param value Parsed step. @returns Its identifier. */
        (value) => value.id);
      expect.soft(ids.indexOf('checkout')).toBeGreaterThanOrEqual(0);
      expect.soft(ids.indexOf('dependencies')).toBeGreaterThan(ids.indexOf('node'));
      expect.soft(ids.indexOf(name === 'candidate' ? 'prepare' : 'finalize')).toBeGreaterThan(ids.indexOf('dependencies'));
    }
  });

test('PUB-WF037: finish has an always-run shell summary fallback for unavailable Node or dependencies',
  /** Checks provider-visible actual job outcomes survive a controller prerequisite failure. @returns Nothing after assertions. */
  () => {
    const value = step('finish', 'summary');
    expect.soft(value.if).toBe('always()');
    expect.soft(value.run ?? '').toContain('GITHUB_STEP_SUMMARY');
    expect.soft(value.run ?? '').toContain('HANSARD_CANDIDATE_RESULT');
    expect.soft(value.run ?? '').toContain('HANSARD_DEPLOY_RESULT');
  });

test('PUB-WF038: finish restores newest accepted state separately from the older candidate checkpoint',
  /** Checks promotion finalization cannot overwrite newer acquired private state during transport. @returns Nothing after assertions. */
  () => {
    const value = step('finish', 'download-state');
    expect.soft(value.uses).toBe('actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333');
    expect.soft(value.with?.['run-id']).toBe('${{ needs.candidate.outputs.state_run_id }}');
    expect.soft((value.with?.['artifact-ids'] ?? '')).toContain('needs.candidate.outputs.state_artifact_id');
    expect.soft(value.with?.path ?? '').toContain('.cache/hansard');
    expect.soft(value.with?.['digest-mismatch']).toBe('error');
  });

test('PUB-WF039: approved deployment revalidates the frozen candidate after any environment wait',
  /** Checks a delayed approval cannot bypass current baseline/evidence validation. @returns Nothing after assertions. */
  () => {
    expect.soft(step('deploy', 'checkout').uses).toBe('actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803');
    expect.soft(step('deploy', 'checkout').with?.ref).toBe('main');
    expect.soft(step('deploy', 'recheck').run).toBe('node scripts/publication.ts promote');
    expect.soft(step('deploy', 'deployment').if).toBe("steps.recheck-result.outputs.outcome == 'ready'");
    expect.soft(step('deploy', 'node').with?.['node-version-file']).toBe('.nvmrc');
    expect.soft(step('deploy', 'dependencies').run).toBe('npm ci');
    expect.soft(job('deploy').env?.GH_TOKEN).toBe('${{ github.token }}');
    expect.soft(job('deploy').env?.HANSARD_TEST_ORIGIN).toBe('${{ vars.HANSARD_TEST_ORIGIN }}');
  });

test('PUB-WF040: candidate readiness output is read from the actual controller result file',
  /** Checks output wiring cannot leave a valid promotion silently skipped. @returns Nothing after assertions. */
  () => {
    expect.soft(job('candidate').outputs?.outcome).toBe('${{ steps.result.outputs.outcome }}');
    expect.soft(step('candidate', 'result').if).toBe('always()');
    expect.soft(step('candidate', 'result').run ?? '').toContain('result.json');
    expect.soft(step('candidate', 'result').run ?? '').toContain('GITHUB_OUTPUT');
  });

test('PUB-WF041: final privileged readiness reads the recheck result before the deployment action',
  /** Checks the second readiness consumer has an actual fresh-producing step. @returns Nothing after assertions. */
  () => {
    expect.soft(step('deploy', 'recheck-result').run ?? '').toContain('result.json');
    expect.soft(step('deploy', 'recheck-result').run ?? '').toContain('GITHUB_OUTPUT');
    const ids = steps('deploy').map(
      /** Reads ordered deployment boundaries. @param value Actual parsed step. @returns Its stable identifier. */
      (value) => value.id);
    expect.soft(ids.indexOf('recheck')).toBeGreaterThanOrEqual(0);
    expect.soft(ids.indexOf('recheck-result')).toBeGreaterThan(ids.indexOf('recheck'));
    expect.soft(ids.indexOf('deployment')).toBeGreaterThan(ids.indexOf('recheck-result'));
  });

test('PUB-WF042: reviewed main can collect a fixed report package without preparing or promoting a candidate',
  /** Checks a concrete trusted evidence producer and its isolated manual condition. @returns Nothing after assertions. */
  () => {
    const value = step('candidate', 'upload-evidence');
    expect.soft(value.if).toBe("github.event_name == 'workflow_dispatch' && inputs.operation == 'evidence'");
    expect.soft(value.uses).toBe('actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9');
    expect.soft(value.with?.name).toBe('hansard-evidence');
    expect.soft(value.with?.path).toBe([
      'specs/001-read-mp-hansard/evidence/publication-reports/performance.json',
      'specs/001-read-mp-hansard/evidence/publication-reports/documentation.json',
      'specs/001-read-mp-hansard/evidence/publication-reports/automated.json',
      'specs/001-read-mp-hansard/evidence/publication-reports/source.json',
    ].join('\n') + '\n');
    expect.soft(value.with?.['retention-days']).toBe(7);
    expect.soft(value.with?.['if-no-files-found']).toBe('error');
  });

test('PUB-WF043: promotion-only artifact resolution is skipped during report collection',
  /** Checks report collection does not require an existing evidence artifact or invoke promotion. @returns Nothing after assertions. */
  () => {
    expect.soft(step('candidate', 'resolve-artifacts').if).toBe("inputs.operation == 'promote'");
    for (const id of ['download-candidate', 'download-pages', 'download-evidence', 'promote']) {
      expect.soft(step('candidate', id).if ?? '').toContain("inputs.operation == 'promote'");
    }
    expect.soft(step('candidate', 'upload-promotion').if ?? '').toContain("inputs.operation == 'promote'");
  });

test('PUB-WF044: report collection fails before uploading a package missing any required report',
  /** Checks every required file, since upload-artifact only rejects a completely empty path set. @returns Nothing after assertions. */
  () => {
    const value = step('candidate', 'check-evidence');
    expect.soft(value.if).toBe("github.event_name == 'workflow_dispatch' && inputs.operation == 'evidence'");
    expect.soft(value.run ?? '').toContain('performance documentation automated source');
    expect.soft(value.run ?? '').toContain('test -f');
    expect.soft(value.run ?? '').toContain('specs/001-read-mp-hansard/evidence/publication-reports/');
    const ids = steps('candidate').map(
      /** Reads actual report-check ordering. @param value Actual configured step. @returns Its identifier. */
      (value) => value.id);
    expect.soft(ids.indexOf('check-evidence')).toBeGreaterThanOrEqual(0);
    expect.soft(ids.indexOf('upload-evidence')).toBeGreaterThan(ids.indexOf('check-evidence'));
  });

test('PUB-WF045: a fresh finish runner receives the current preparation failure journal independently of accepted state',
  /** Checks actual started-run outcomes survive a failed candidate job and separate-runner finalization. @returns Nothing after assertions. */
  () => {
    const upload = step('candidate', 'upload-preparation-outcomes');
    expect.soft(upload.if).toBe('always()');
    expect.soft(upload.uses).toBe('actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9');
    expect.soft(upload.with?.name).toBe('hansard-preparation-outcomes');
    expect.soft(upload.with?.['retention-days']).toBe(7);
    expect.soft(upload.with?.['include-hidden-files']).toBe(true);
    expect.soft(upload.with?.path ?? '').toContain('.cache/hansard/publication-runs');
    expect.soft(upload.with?.path ?? '').toContain('.cache/hansard/receipts/**/refresh.json');
    expect.soft(job('candidate').outputs?.preparation_outcomes_artifact_id).toBe('${{ steps.upload-preparation-outcomes.outputs.artifact-id }}');
    const download = step('finish', 'download-preparation-outcomes');
    expect.soft(download.if ?? '').toContain('always()');
    expect.soft(download.uses).toBe('actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333');
    expect.soft(download.with?.['artifact-ids']).toBe('${{ needs.candidate.outputs.preparation_outcomes_artifact_id }}');
    expect.soft(download.with?.['run-id']).toBe('${{ github.run_id }}');
    expect.soft(download.with?.['digest-mismatch']).toBe('error');
    expect.soft(download.with?.path ?? '').toContain('.cache/hansard');
  });

test('PUB-WF046: preparation installs all locked native browser engines before running production checks',
  /** Checks fresh Ubuntu runners have the actual native engines, without installing during report collection or promotion. @returns Nothing after assertions. */
  () => {
    const value = step('candidate', 'browsers');
    expect.soft(value.if).toBe("github.event_name == 'schedule' || inputs.operation == 'prepare'");
    expect.soft(value.run).toBe('npx playwright install --with-deps chromium firefox webkit');
    const ids = steps('candidate').map(
      /** Reads prerequisite ordering. @param value Actual parsed step. @returns Its stable identifier. */
      (value) => value.id);
    expect.soft(ids.indexOf('browsers')).toBeGreaterThan(ids.indexOf('dependencies'));
    expect.soft(ids.indexOf('prepare')).toBeGreaterThan(ids.indexOf('browsers'));
  });

test('PUB-WF047: capped resume transport includes the original failure and refresh receipts',
  /** Checks required resumed-run accounting is transported with the original partial checkpoint. @returns Nothing after assertions. */
  () => {
    const path = step('candidate', 'upload-partial').with?.path ?? '';
    expect.soft(path).toContain('.cache/hansard/receipts/**/failure.json');
    expect.soft(path).toContain('.cache/hansard/receipts/**/refresh.json');
  });

test('PUB-WF048: finalization can identify the actually executed Pages action independently of job success',
  /** Checks a stable provider step name for distinguishing a skipped deployment after recheck from actual publication. @returns Nothing after assertions. */
  () => { expect(step('deploy', 'deployment').name).toBe('Deploy exact candidate'); });

test('PUB-WF049: accepted recovery uploads only the existing bounded current-checkpoint bundle',
  /** Checks successive runs cannot embed every historical full archive in their newest state artifact. @returns Nothing after assertions. */
  () => {
    expect(step('candidate', 'upload-state').with?.path).toBe([
      '${{ runner.temp }}/hansard-publication/acquired-state/checkpoint.json',
      '${{ runner.temp }}/hansard-publication/acquired-state/origin.json',
      '${{ runner.temp }}/hansard-publication/acquired-state/snapshots/',
    ].join('\n') + '\n');
  });
