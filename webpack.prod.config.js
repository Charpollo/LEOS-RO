const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production', // CRITICAL: Enables all optimizations
  entry: './frontend/js/app.js',
  output: {
    filename: 'js/[name].[contenthash:8].js', // Cache busting with hash
    path: path.resolve(__dirname, 'frontend/dist'),
    publicPath: '/',
    clean: true
  },
  optimization: {
    minimize: true, // CRITICAL: Enable minification
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove ALL console.logs
            drop_debugger: true, // Remove debugger statements
            dead_code: true,
            passes: 2 // Multiple passes for better compression
          },
          mangle: {
            properties: {
              regex: /^_/ // Mangle properties starting with _
            }
          },
          format: {
            comments: false, // Remove all comments
          },
        },
        extractComments: false, // Don't create LICENSE.txt
      }),
    ],
    // Code splitting to make reverse engineering harder
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        babylon: {
          test: /[\\/]node_modules[\\/]@babylonjs[\\/]/,
          name: 'babylon',
          priority: 10,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 5,
        },
      },
    },
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
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true,
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'frontend/css', to: 'css' },
        { from: 'frontend/assets', to: 'assets' },
        { from: 'frontend/templates', to: 'templates' },
        { from: 'frontend/data', to: 'data' },
        { from: 'frontend/login.html', to: 'login.html' },
        { from: 'frontend/js/auth', to: 'js/auth' }
      ]
    }),
    // Define production environment
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    // Add banner warning about copyright
    new webpack.BannerPlugin({
      banner: 'Copyright (c) 2024 CyberRTS. All rights reserved. Unauthorized copying prohibited.',
      entryOnly: true,
    }),
  ],
  devtool: false, // CRITICAL: NO SOURCE MAPS IN PRODUCTION
  performance: {
    hints: false
  }
};