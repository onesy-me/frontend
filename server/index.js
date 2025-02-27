const fs = require('fs');
const path = require('path');
const mime = require('mime');
const express = require('express');
const compression = require('compression');
const methodOverride = require('method-override');
const cors = require('cors');

const port = process.env.PORT || 3000;

const run = async () => {
  const app = express();

  app.set('json spaces', 2);
  app.set('subdomain offset', 1);

  app.use(compression());
  app.use(methodOverride());
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  app.on('error', error => {
    switch (error.code) {
      case 'EACCES':
        console.error(`${port} requires elevated privileges`);

        return process.exit(1);

      case 'EADDRINUSE':
        console.error(`${port} is already in use`);

        return process.exit(1);

      default:
        throw error;
    }
  });

  process.on('unhandledRejection', error => {
    console.log('!!! Unhandled Rejection !!!', error);
  });

  process.on('uncaughtException', error => {
    console.log('!!! Uncaught Exception !!!', error);
  });

  app.use(express.static(path.join(__dirname, '../build'), { index: false, dotfiles: 'allow' }));

  app.get('*', (req, res) => {
    const pathname = req.path;
    const buildPath = path.join(__dirname, '../build');
    const requestedFilePath = path.join(buildPath, pathname);

    // requested file ie. service-worker.js, from outside build/static folder 
    if (path.extname(pathname)) {
      // if the requested file exists in the build directory
      if (fs.existsSync(requestedFilePath) && fs.statSync(requestedFilePath).isFile()) {
        const mimeType = mime.getType(requestedFilePath) || 'application/octet-stream';

        res.setHeader('Content-Type', mimeType);

        console.log('Serving', pathname, mimeType, requestedFilePath);

        return res.status(200).sendFile(requestedFilePath);
      }

      // not found 
      console.error('No file', pathname);

      return res.status(404).send('File not found');
    }

    return res.sendFile(path.join(__dirname, '../build/index.html'));
  });

  app.listen(port, error => {
    if (error) throw error;

    console.log(`onesy app started 🌱 at port ${port}`);
  });
};

run();
