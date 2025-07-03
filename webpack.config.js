const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './frontend/js/app.js',
  output: {
    filename: 'js/bundle.[contenthash].js',
    chunkFilename: 'js/[name].[contenthash].chunk.js',
    path: path.resolve(__dirname, 'frontend/dist'),
    clean: true // Clean the build directory on each build
  },
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info']
          },
          mangle: true,
          format: {
            comments: false
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
          priority: 10,
          reuseExistingChunk: true
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },
    runtimeChunk: 'single'
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
      inject: true,  // Enable automatic injection for cache-busted filenames
      minify: process.env.NODE_ENV === 'production' ? {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      } : false,
      templateParameters: {
        // This will be used if we need to replace paths
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'frontend/css', to: 'css' },
        { from: 'frontend/assets', to: 'assets' },
        { from: 'frontend/templates', to: 'templates' }
      ]
    }),
    ...(process.env.NODE_ENV === 'production' ? [
      new CompressionPlugin({
        filename: '[path][base].gz',
        algorithm: 'gzip',
        test: /\.(js|css|html|svg|json)$/,
        threshold: 10240,
        minRatio: 0.8
      }),
      new CompressionPlugin({
        filename: '[path][base].br',
        algorithm: 'brotliCompress',
        test: /\.(js|css|html|svg|json)$/,
        threshold: 10240,
        minRatio: 0.8
      })
    ] : [])
  ],
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  performance: {
    hints: false // Disable size warnings for entry points and assets
  }
};
