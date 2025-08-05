const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development', // Always use development mode to keep console.log and avoid silent failures
  entry: './frontend/js/app.js',
  output: {
    filename: 'js/bundle.js', // Simplified filename without hashing
    path: path.resolve(__dirname, 'frontend/dist'),
    clean: true // Clean the build directory on each build
  },
  optimization: {
    minimize: false, // Disable minification to keep code readable and debuggable
    // Disable code splitting for simplicity - single bundle file
    splitChunks: false
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
      inject: true,  // Enable automatic injection
      minify: false, // Keep HTML readable
      templateParameters: {
        // This will be used if we need to replace paths
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'frontend/css', to: 'css' },
        { from: 'frontend/assets', to: 'assets' },
        { from: 'frontend/templates', to: 'templates' },
        { from: 'frontend/data', to: 'data' }
      ]
    })
  ],
  devtool: 'source-map', // Always include source maps for debugging
  performance: {
    hints: false // Disable size warnings for entry points and assets
  }
};
