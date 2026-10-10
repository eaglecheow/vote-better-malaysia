import { expect, test, vi } from 'vitest';

/** Loads the actual browser configuration with one controlled frozen-artifact setting.
 * @param site Exact prebuilt site directory, or null for ordinary local development.
 * @returns The actual configured preview command.
 * @remarks Temporarily changes one environment variable and clears only the module cache.
 */
async function command(site: string | null): Promise<string> {
  const previous = process.env.HANSARD_FROZEN_SITE;
  if (site === null) delete process.env.HANSARD_FROZEN_SITE; else process.env.HANSARD_FROZEN_SITE = site;
  vi.resetModules();
  try { const { default: configuration } = await import('../../playwright.config.ts');
    const server = configuration.webServer;
    return !server || Array.isArray(server) ? '' : server.command;
  } finally { if (previous === undefined) delete process.env.HANSARD_FROZEN_SITE; else process.env.HANSARD_FROZEN_SITE = previous; vi.resetModules(); }
}

test('BROWSER-CONFIG001 frozen candidate checks never rebuild or replace the tested bytes',
  /** Checks the real frozen preview branch independently of controller mocks. @returns Completion after the no-build assertion. */
  async () => { expect(await command('/private/tmp/hansard-frozen')).not.toContain('npm run build'); });

test('BROWSER-CONFIG002 frozen preview passes its directory as a quoted environment value',
  /** Checks a path containing shell syntax remains a value, while the configured subpath and strict port stay fixed. @returns Completion after actual command assertions. */
  async () => { expect(await command("/private/tmp/frozen ' $()-fixture")).toBe('npm run preview -- --outDir "$HANSARD_FROZEN_SITE" --host 127.0.0.1 --port 4173 --strictPort'); });

test('BROWSER-CONFIG-CONTROL ordinary local browser checks still build before preview',
  /** Records the existing development behavior without counting it as RED. @returns Completion after the control assertion. */
  async () => { expect(await command(null)).toBe('npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort'); });
