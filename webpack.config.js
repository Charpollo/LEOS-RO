const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './frontend/js/app.js',
  output: {
    filename: 'js/bundle.js',
    path: path.resolve(__dirname, 'frontend/dist'),
    clean: true // Clean the build directory on each build
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
      inject: false,  // Prevent automatic injection of bundle.js to rely on manual include
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
    })
  ],
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  performance: {
    hints: false // Disable size warnings for entry points and assets
  }
};
