const path = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { exec } = require('child_process');
const dotenv = require('dotenv');
const TerserPlugin = require('terser-webpack-plugin');
const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin');
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const port = process.env.PORT || 3000;

const env = process.env.NODE_ENV || 'development';

const isDev = ['dev', 'development'].includes(env);
const isProd = ['prod', 'production'].includes(env);

// Load environment variables from .env* file
const envs = [];

if ([undefined, '', 'local'].includes(env)) envs.push(path.resolve('./.env.local'));
else if (['dev', 'development'].includes(env)) envs.push(
  path.resolve('./.env.dev'),
  path.resolve('./.env.development')
);
else if (['prod', 'production'].includes(env)) envs.push(
  path.resolve('./.env.prod'),
  path.resolve('./.env.production')
);
else if (['test'].includes(env)) envs.push(
  path.resolve('./.env.test'),
  path.resolve('./.env.testing')
);

// Import environment variable values
envs.forEach(env => dotenv.config({
  path: env
}));

const paths = {
  src: path.resolve(__dirname, 'src'),
  public: path.resolve(__dirname, 'public'),
  build: path.resolve(__dirname, 'build')
};

// Dynamically create aliases for all first-level files, subdirectories in 'src/'
const aliases = fs.readdirSync(paths.src)
  .reduce((result, dir) => {
    result[dir.replace(/\.(tsx|jsx|ts|js)/g, '')] = path.join(paths.src, dir); // src/ui (folder), src/utils (file) etc. 

    return result;
  }, {});

const REACT_APP = /^REACT_APP_/i;

const envKeysRaw = Object.keys(process.env)
  .filter(key => REACT_APP.test(key))
  .reduce((env, key) => {
    env[key] = process.env[key];

    return env;
  },
    {
      NODE_ENV: env,
      PUBLIC_URL: '',
    }
  );

// Stringify all values so we can feed into Webpack DefinePlugin
const envKeys = {
  'process.env': Object.keys(envKeysRaw).reduce((env, key) => {
    env[key] = JSON.stringify(envKeysRaw[key]);

    return env;
  }, {})
};

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

class CopyWebpackPlugin {

  apply(compiler) {
    compiler.hooks.done.tap('CopyWebpackPlugin', () => {
      const ignore = ['index.html'];

      if (fs.existsSync(paths.public)) {
        fs.readdirSync(paths.public).forEach(file => {
          const sourcePath = path.join(paths.public, file);
          const destinationPath = path.join(paths.build, file);

          if (ignore.includes(file) || file.startsWith('.')) return;

          if (fs.statSync(sourcePath).isDirectory()) {
            fs.copySync(sourcePath, destinationPath);
          }
          else {
            fs.copyFileSync(sourcePath, destinationPath);
          }
        });

        console.log('✅ Moved public folders, files to build');
      }
    });
  }

}

module.exports = {
  mode: isProd ? 'production' : isDev ? 'development' : 'none',

  entry: [
    './src/index.tsx',
    './src/service-worker.js',

    isDev && require.resolve('react-dev-utils/webpackHotDevClient')
  ].filter(Boolean),

  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: process.env.PUBLIC_URL || '/',
    filename: isProd ? 'static/js/[name].[contenthash:8].js' : isDev && 'static/js/[name].js',
    chunkFilename: isProd ? 'static/js/[name].[contenthash:8].chunk.js' : isDev && 'static/js/[name].chunk.js',
    clean: true
  },

  devtool: isDev && 'cheap-module-source-map',

  module: {
    rules: [
      // images 
      {
        test: /\.(png|jpe?g|gif|bmp|webp)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/media/[name].[hash:8].[ext]',
        }
      },
      // svg 
      {
        test: /\.svg$/,
        use: '@svgr/webpack'
      },
      // other 
      {
        oneOf: [
          // js 
          // {
          //   test: /\.(ts|tsx|js|jsx|mjs)$/,
          //   exclude: /node_modules/,
          //   include: paths.src,
          //   loader: require.resolve('babel-loader'),
          //   options: {
          //     customize: require.resolve('babel-preset-react-app/webpack-overrides'),
          //     cacheDirectory: true,
          //     cacheCompression: isProd,
          //     compact: isProd,
          //     plugins: [
          //       "react-refresh/babel"
          //     ]
          //   }
          // },
          {
            test: /\.(js|jsx|ts|tsx)$/,
            include: paths.src,
            exclude: /node_modules/,
            use: {
              loader: "babel-loader",
              options: {
                presets: [
                  ["@babel/preset-env", { targets: "defaults" }],
                  ["@babel/preset-react", { runtime: "automatic" }],
                  "@babel/preset-typescript",
                ],
                plugins: [
                  "react-refresh/babel"
                ]
              }
            }
          },
          // files 
          {
            loader: require.resolve('file-loader'),
            exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.(png|jpe?g|gif|bmp|webp)$/i, /\.html$/, /\.json$/],
            options: {
              name: 'static/media/[name].[hash:8].[ext]'
            }
          }
        ]
      }
    ],
  },

  optimization: {
    minimize: isProd,
    minimizer: [
      // This is only used in production mode
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2
          },
          mangle: {
            safari10: true
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true
          }
        }
      })
    ],
    splitChunks: {
      chunks: 'all',
      name: false
    },
    runtimeChunk: true
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      // by default all first-level files, subdirectories in 'src/' 
      ...aliases
    }
  },

  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: './public/index.html',

      ...(isProd && {
        minify: {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        },
      })
    }),
    isProd && new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime~.+[.]js/]),
    new webpack.DefinePlugin(envKeys),
    isDev && new webpack.HotModuleReplacementPlugin(),
    isDev && new ReactRefreshWebpackPlugin(),
    new CopyWebpackPlugin(),
    new Plugins()
  ].filter(Boolean),

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
    liveReload: false,
    historyApiFallback: true
  }
};
