const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { exec } = require('child_process');
const dotenv = require('dotenv');

const port = process.env.PORT || 3000;

const env = process.env.NODE_ENV;

const isDev = ['dev', 'development'].includes(env);

// Load environment variables from .env file
dotenv.config();

const envKeys = Object.keys(process.env)
  .filter(key => key.startsWith('REACT_APP_') || key === 'PUBLIC_URL')
  .reduce((result, key) => {
    result[`process.env.${key}`] = JSON.stringify(process.env[key]);

    return result;
  }, {});

class Plugins {

  constructor() {
    this.invoked = 0;
  }

  apply(compiler) {
    // log 
    compiler.hooks.afterCompile.tap('LogPlugin', () => {
      if (!isDev) return;

      if (!this.invoked || this.invoked > 1) {
        console.clear();

        console.log(`🌱 onesy app running on http://localhost:${port}`);
      }

      this.invoked++;
    });

    // lint 
    compiler.hooks.watchRun.tap('LintPlugin', () => {
      exec(`npx tslint -c tslint.json --project tsconfig.json 'src/**/*.{ts,tsx}'`, (error, message) => {
        if (error) {
          console.error('🟡 Lint');

          console.error(message);
        }
      });
    });

    // type 
    compiler.hooks.watchRun.tap('TypePlugin', () => {
      exec(`npx tsc --noEmit`, (error, message) => {
        if (error) {
          console.error('🟠 Types');

          console.error(message);
        }
      });
    });
  }
}

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: process.env.PUBLIC_URL || '/',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.(png|jpe?g|gif|webp)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.svg$/,
        use: '@svgr/webpack'
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      assets: path.resolve(__dirname, 'src/assets')
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new webpack.DefinePlugin(envKeys),
    new Plugins()
  ],
  devServer: {
    static: './build',
    port,
    open: false,
    client: {
      overlay: true,
      progress: false,
      logging: 'warn'
    },
    compress: true,
    hot: true,
    historyApiFallback: true
  },
  mode: process.env.NODE_ENV || 'development'
};
