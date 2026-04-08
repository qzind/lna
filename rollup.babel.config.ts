import type {RollupBabelInputPluginOptions} from "@rollup/plugin-babel";

export default {
	babelHelpers: 'bundled',
	extensions: ['.js', '.ts'],
	targets: ['cover 99.9%', 'IE 11'],
	// Exclude every package except ip-address, avoids core-js
	// itself being transpiled, causing errors.
	// https://github.com/rollup/plugins/tree/master/packages/babel#external-dependencies
	// https://gist.github.com/bwindels/7eff8a2cf02ba6ad13ace061a8d68c3c
	exclude: /node_modules\/(?!ip-address\/)/,
	presets: [
		[
			'@babel/preset-env',
			{
				useBuiltIns: 'usage',
				corejs: "3.49",
			}
		],
	],
} satisfies RollupBabelInputPluginOptions;
