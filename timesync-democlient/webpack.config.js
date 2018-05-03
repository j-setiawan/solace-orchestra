const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const solclientjs = path.resolve(__dirname, '../common/solclient.js');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    alias: {
      solclientjs$: solclientjs
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      title:    'Timesync democlient',
    })
  ],
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test:/\.(s*)css$/,
        use:['style-loader','css-loader', 'sass-loader']
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /\.(wav)$/,
        use: [
          'file-loader'
        ]
      },
      {
        test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
//            outputPath: 'fonts/',    // where the fonts will go
            publicPath: '../'       // override the default path
          }
        }]
      },
      {
        test: require.resolve(solclientjs),
        use: 'exports-loader?window.solace'
      }
    ]
  }
};
