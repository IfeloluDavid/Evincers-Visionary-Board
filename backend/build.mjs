// Bundles the Lambda into dist/index.mjs. The AWS SDK v3 ships with the
// nodejs22.x Lambda runtime, so it is left external to keep the zip tiny.
import { build } from 'esbuild';
import { rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });

await build({
  entryPoints: ['src/lambda.ts'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  external: ['@aws-sdk/*'],
  sourcemap: true,
  logLevel: 'info',
});
