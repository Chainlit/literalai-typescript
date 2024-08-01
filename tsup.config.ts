import { defineConfig } from 'tsup';

export default defineConfig({
  target: 'es2020',
  format: ['cjs', 'esm'],
  splitting: true,
  banner: ({ format }) => {
    if (format === 'esm') {
      return {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
      };
    }
  },
  sourcemap: false,
  clean: true,
  dts: true
});
