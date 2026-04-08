import type {RollupOptions} from 'rollup'
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

import babelOptions from './rollup.babel.config.ts';

export default {
	input: 'src/index.ts',
	output: {
		file: 'dist/lna.umd.cjs',
		format: 'umd',
		name: 'lna',
	},
	plugins: [
		typescript(),
		commonjs(),
		nodeResolve(),
		babel(babelOptions),
	],
} satisfies RollupOptions;
