import { resolve } from 'node:path';
import { defineConfig, type ResolvedConfig } from 'vite';
import { buildWorker } from './scripts/build-worker.ts';

let configuration: ResolvedConfig;

export default defineConfig({
  base: '/vote-better-malaysia/',
  plugins: [{
    name: 'hansard-shell',
    apply: 'build',
    /** Captures Vite's actual source/base/output configuration for final shell generation.
     * @param value Fully resolved native Vite configuration.
     * @returns Nothing after retaining the resolved build configuration.
     * @remarks Updates this plugin's captured configuration only.
     */
    configResolved(value): void { configuration = value; },
    /** Generates the classic worker only after the completed application output exists.
     * @returns Completion after validated shell generation.
     * @throws Build/output/icon/metadata failures through the production build command.
     * @remarks Writes generated worker/index in the actual resolved output; nested bundling disables config and writes.
     */
    async closeBundle(): Promise<void> {
      await buildWorker({ projectRoot: configuration.root, outDir: resolve(configuration.root, configuration.build.outDir), base: configuration.base });
    },
  }],
});
