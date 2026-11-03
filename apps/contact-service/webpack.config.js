const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

/**
 * Configuration contact-service webpack
 *
 * @description
 * Builds the HTTP service and standalone CLI entry point, copying migrations beside the generated bundle.
 */
module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/contact-service'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      additionalEntryPoints: [{ entryName: 'cli', entryPath: './src/cli.ts' }],
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets', { input: './migrations', glob: '**/*', output: 'migrations' }],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
    }),
  ],
};
