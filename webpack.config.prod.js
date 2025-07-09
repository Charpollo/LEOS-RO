const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const JavaScriptObfuscator = require('webpack-obfuscator');

module.exports = {
  mode: 'production',
  entry: './frontend/js/app.js',
  output: {
    filename: 'js/bundle.[contenthash].js',
    path: path.resolve(__dirname, 'frontend/dist'),
    clean: true
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console logs
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 2
          },
          mangle: {
            toplevel: true,
            reserved: ['BABYLON'] // Keep BABYLON global intact
          },
          output: {
            comments: false,
            beautify: false
          }
        },
        extractComments: false
      })
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        babylon: {
          test: /[\\/]node_modules[\\/]@babylonjs[\\/]/,
          name: 'babylon',
          priority: 10
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 5
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './frontend/index.html',
      filename: 'index.html',
      inject: true,
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'frontend/css', to: 'css' },
        { from: 'frontend/assets', to: 'assets' },
        { from: 'frontend/templates', to: 'templates' },
        { from: 'frontend/data', to: 'data' }
      ]
    }),
<<<<<<< HEAD
    // JavaScript obfuscation - optimized for lower memory usage
    new JavaScriptObfuscator({
      // Lighter obfuscation settings to reduce memory usage
      compact: true,
      controlFlowFlattening: false, // Disabled - very memory intensive
      deadCodeInjection: false, // Disabled - very memory intensive
      debugProtection: false,
      disableConsoleOutput: true,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: false, // Disabled - memory intensive
      renameGlobals: false,
      selfDefending: false,
=======
    // JavaScript obfuscation - aggressive but avoiding known issues
    new JavaScriptObfuscator({
      // Aggressive obfuscation minus features that break workers
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      debugProtection: false, // Keep false - can break in production
      disableConsoleOutput: true,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: true,
      renameGlobals: false, // MUST be false - breaks Babylon.js
      selfDefending: false, // Keep false - can break in production
>>>>>>> bug/fixes
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 5,
      stringArray: true,
      stringArrayCallsTransform: false, // Disabled - memory intensive
      stringArrayEncoding: [], // No encoding - reduces memory
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 1,
      stringArrayWrappersChainedCalls: false,
      stringArrayWrappersParametersMaxCount: 2,
      stringArrayWrappersType: 'variable',
      stringArrayThreshold: 0.75,
      transformObjectKeys: false, // Disabled - memory intensive
      unicodeEscapeSequence: false // Disabled - memory intensive
    }, [
<<<<<<< HEAD
      // Exclude vendor bundles from obfuscation
=======
      // Exclude vendor bundles and any file with 'worker' in the name
>>>>>>> bug/fixes
      'babylon.*.js',
      'vendors.*.js',
      '*worker*.js',
      '*Worker*.js'
    ]),
    // Gzip compression for smaller file sizes
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    }),
    // Brotli compression (better than gzip, if supported)
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
      filename: '[path][base].br'
    })
  ],
  devtool: false, // No source maps in production
  performance: {
    maxEntrypointSize: 1024000, // 1MB
    maxAssetSize: 1024000, // 1MB
    hints: 'warning'
  }
};