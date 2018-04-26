const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const solclientjs = path.resolve(__dirname, '../common/solclient-debug.js');

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
            title: 'Symphony',
            template: './src/index.html'
        })
    ],
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: [{
                    loader: "style-loader" // creates style nodes from JS strings
                }, {
                    loader: "css-loader" // translates CSS into CommonJS
                }, {
                    loader: "sass-loader" // compiles Sass to CSS
                }]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader'
                ]
            },
            {
                test: /\.(wav|woff|woff2|eot|ttf|otf)$/,
                use: [
                    'file-loader'
                ]
            },
            {
              test: require.resolve(solclientjs),
              use: 'exports-loader?window.solace'
            }
            ]
    }
};
