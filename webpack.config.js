const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './frontend/js/app.js',
  output: {
    filename: 'js/bundle.js',
    path: path.resolve(__dirname, 'frontend'),
    clean: {
      keep: /assets\//  // Keep the assets directory
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
      inject: false  // Prevent automatic injection of bundle.js to rely on manual include
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'frontend/css', to: 'css' },
        { from: 'frontend/assets', to: 'assets' }
      ]
    })
  ],
  devtool: 'source-map',
};
