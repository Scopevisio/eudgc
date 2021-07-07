const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './src/index.ts',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            util: require.resolve('util/'),
            assert: require.resolve('assert/'),
            stream: require.resolve('stream-browserify'),
            zlib: require.resolve('browserify-zlib'),
            "crypto": false,
            "crypto-browserify": require.resolve('crypto-browserify'), //if you want to use this module also don't forget npm i crypto-browserify 
        },
    },
    output: {
        filename: 'eudgc.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new webpack.LoaderOptionsPlugin({
            options: {
                productionSourceMap: false
            }
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        })
    ],
    optimization: {
        //minimizer: [new UglifyJsPlugin()],
    },
    devServer: {
        contentBase: './dist',
        hot: false,
        open: true,
        port: 9090,
    },
};

