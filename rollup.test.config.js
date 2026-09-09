import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';

// Empaqueta el arnés con React incluido en un IIFE, para que el smoke test
// pueda cargarlo desde file:// sin servidor ni CDN.
export default {
  input: 'test/harness.tsx',
  output: {
    file: 'test/harness.js',
    format: 'iife',
    sourcemap: false
  },
  plugins: [
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('development')
    }),
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    typescript({
      tsconfig: './test/tsconfig.json',
      include: ['src/**/*.ts', 'src/**/*.tsx', 'test/**/*.ts', 'test/**/*.tsx']
    })
  ]
};
