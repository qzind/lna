import type {OutputOptions, Plugin, RollupOptions} from 'rollup'
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import { dts } from "rollup-plugin-dts"

import pkg from './package.json' with {type: 'json'};
import babelOptions from './rollup.babel.config.ts';

function makeConfig(conf: Partial<RollupOptions & { plugins?: Plugin[] }>): RollupOptions {
	const outputOptions: OutputOptions = {
		sourcemap: true,
	};
	return {
		input: 'src/index.ts',
		external: Object.keys(pkg.dependencies),
		...conf,
		output: conf.output instanceof Array
			? conf.output.map(o => ({...outputOptions, ...o}))
			: {...outputOptions, ...conf.output},
		plugins: [
			typescript({
				declaration: true,
				declarationDir: 'dist/dts',
			}),
			commonjs(),
			nodeResolve(),
			...(conf.plugins ?? []),
		],
	};
}

export default [
	makeConfig({
		output: [
			{
				format: 'iife',
				file: 'dist/lna.bundle.js',
				name: 'lna',
			},
			{
				format: 'iife',
				file: 'dist/lna.bundle.min.js',
				name: 'lna',
				plugins: [terser()],
			},
		],
		plugins: [
			babel(babelOptions),
		],
		external: [],
	}),
	makeConfig({
		output: {
			file: pkg.module,
			format: 'esm',
		},
	}),
	makeConfig({
		output: {
			file: pkg.main,
			format: 'cjs',
		},
	}),
	{
		input: './dist/dts/index.d.ts',
		output: {
			file: pkg.types,
		},
		plugins: [dts()],
	}
] satisfies RollupOptions[];
