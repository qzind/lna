import type {RollupOptions} from 'rollup'
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

import babelOptions from './rollup.babel.config.ts';

const makeConfig = ({format, minify}: {
	format: RollupOptions['output']['format'],
	minify: boolean,
}): RollupOptions => ({
	input: 'src/index.ts',
	output: {
		file: `dist/${format}/lna${minify ? '.min.js' : '.js'}`,
		format: format,
		name: 'lna',
		sourcemap: true,
	},
	plugins: [
		typescript(),
		commonjs(),
		nodeResolve(),
		babel({
			...babelOptions,
			targets: format === 'esm'
				? {
					browsers: 'defaults',
					esmodules: true,
				} : babelOptions.targets,
		}),
		...(minify ? [terser()] : []),
	],
});

export default [
	makeConfig({format: 'umd', minify: true}),
	makeConfig({format: 'umd', minify: false}),
	makeConfig({format: 'esm', minify: true}),
	makeConfig({format: 'esm', minify: false}),
];
