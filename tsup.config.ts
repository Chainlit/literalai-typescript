import { defineConfig } from 'tsup';

export default defineConfig({
  target: 'es2020',
  format: ['cjs', 'esm'],
  splitting: true,
  sourcemap: false,
  clean: true,
  dts: true
});
