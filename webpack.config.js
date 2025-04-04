const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const webpack = require('webpack');
const dotenv = require('dotenv');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin');
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const port = process.env.PORT || 3000;

const env = process.env.NODE_ENV;
const envVars = process.env.ENV_VARS || env;

const isDev = ['dev', 'development', '', undefined].includes(env);
const isProd = ['prod', 'production'].includes(env);

// Load environment variables from .env* file
const envs = [];

if (['local', '', undefined].includes(envVars)) envs.push(path.resolve('./.env.local'));
else if (['dev', 'development'].includes(envVars)) envs.push(
  path.resolve('./.env.dev'),
  path.resolve('./.env.development')
);
else if (['prod', 'production'].includes(envVars)) envs.push(
  path.resolve('./.env.prod'),
  path.resolve('./.env.production')
);
else if (['test'].includes(envVars)) envs.push(
  path.resolve('./.env.test'),
  path.resolve('./.env.testing')
);

// Import environment variable values
envs.forEach(item => dotenv.config({
  path: item
}));

const paths = {
  src: path.resolve(__dirname, 'src'),
  public: path.resolve(__dirname, 'public'),
  build: path.resolve(__dirname, 'build')
};

// Dynamically create aliases for all first-level files, subdirectories in 'src/'
const aliases = fs.readdirSync(paths.src)
  .reduce((result, dir) => {
    // src/ui (folder), src/utils (file) etc.
    result[dir.replace(/\.(tsx|jsx|ts|js)/g, '')] = path.join(paths.src, dir);

    return result;
  }, {});

const REACT_APP = /^REACT_APP_/i;

const envKeysRaw = Object.keys(process.env)
  .filter(key => REACT_APP.test(key))
  .reduce((result, key) => {
    result[key] = process.env[key];

    return result;
  },
    {
      NODE_ENV: env || 'development',
      PUBLIC_URL: ''
    }
  );

const envKeys = {
  'process.env': Object.keys(envKeysRaw).reduce((result, key) => {
    result[key] = JSON.stringify(envKeysRaw[key]);

    return result;
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

    // if this is called in dev 
    // for hot reload, it takes too long to refresh 
    if (isProd) {
      // lint, type 
      compiler.hooks.done.tap('LintTypePlugin', () => {
        // lint 
        exec(`npx tslint -c tslint.json --project tsconfig.json 'src/**/*.{ts,tsx}'`, (error, message) => {
          if (error) {
            console.error('🟡 Lint');

            console.error(message);
          }
        });

        // type 
        exec(`npx tsc --noEmit --skipLibCheck`, (error, message) => {
          if (error) {
            console.error('🟠 Types');

            console.error(message);

            // exit process if 
            // there are type errors 
            process.exit(1);
          }
        });
      });
    }
  }
}

class CopyWebpackPlugin {
  apply(compiler) {
    compiler.hooks.done.tap('CopyWebpackPlugin', () => {
      const ignore = ['index.html'];

      if (!fs.existsSync(paths.public)) return;

      // production 
      if (isProd) {
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

  entry: {
    main: [
      './src/index.tsx',

      isDev && require.resolve('react-dev-utils/webpackHotDevClient')
    ].filter(Boolean),

    'service-worker': './src/service-worker.js'
  },

  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: process.env.PUBLIC_URL || '/',
    filename: pathData => pathData.chunk.name === 'service-worker' ? '[name].js' : isProd ? 'static/js/[name].[contenthash:8].js' : isDev && 'static/js/[name].js',
    chunkFilename: isProd ? 'static/js/[name].[contenthash:8].chunk.js' : isDev && 'static/js/[name].chunk.js',
    clean: true
  },

  devtool: isDev && 'cheap-module-source-map',

  cache: {
    type: 'filesystem'
  },

  module: {
    rules: [
      // images 
      {
        test: /\.(png|jpe?g|gif|bmp|webp)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/media/[name].[hash:8].[ext]'
        }
      },
      // svg 
      {
        test: /\.svg$/,
        use: '@svgr/webpack'
      },
      {
        test: /service-worker\.js$/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      },
      // other 
      {
        oneOf: [
          // js  
          {
            test: /\.(ts|tsx|js|jsx|mjs)$/,
            include: paths.src,
            exclude: /node_modules/,
            use: [
              'thread-loader',
              {
                loader: 'babel-loader',
                options: {
                  customize: require.resolve('babel-preset-react-app/webpack-overrides'),
                  cacheDirectory: true,
                  cacheCompression: isProd,
                  compact: isProd,
                  presets: [
                    ['@babel/preset-env', { targets: 'defaults' }],
                    ['@babel/preset-react', { runtime: 'automatic' }],
                    '@babel/preset-typescript'
                  ],
                  plugins: [
                    isDev && 'react-refresh/babel'
                  ].filter(Boolean)
                }
              }
            ]
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
    runtimeChunk: 'single'
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
        }
      })
    }),
    isProd && new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/runtime~.+[.]js/]),
    new webpack.DefinePlugin(envKeys),
    isDev && new ReactRefreshWebpackPlugin({
      overlay: false
    }),
    new CopyWebpackPlugin(),
    new Plugins()
  ].filter(Boolean),

  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'build'),
        publicPath: '/'
      },
      {
        directory: path.join(__dirname, 'public'),
        publicPath: '/'
      }
    ],
    port,
    open: false,
    client: {
      overlay: false,
      progress: false,
      logging: 'error'
    },
    watchFiles: {
      paths: ['src/**/*', 'public/**/*'],
      options: {
        ignored: /node_modules/
      }
    },
    compress: true,
    hot: true,
    liveReload: false,
    historyApiFallback: true
  }
};
