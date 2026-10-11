/**
 * Builds the Express application (but does NOT start listening).
 * Keeping this separate from server.js lets the tests import the app directly.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { config } = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet()); // sensible security headers
  app.use(
    cors({
      origin: config.clientOrigin, // only our React app may call the API from a browser
      credentials: true, // allow the login cookie
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (config.isDevelopment) app.use(morgan('dev')); // request log in the terminal

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
