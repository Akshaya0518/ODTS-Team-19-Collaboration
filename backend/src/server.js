/** Entry point: check settings -> connect to MongoDB -> start the HTTP server. */
const { config, validateEnv } = require('./config/env');
const { connectDB } = require('./config/db');
const createApp = require('./app');

async function start() {
  try {
    validateEnv();
    await connectDB(config.mongoUri);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const server = createApp().listen(config.port, () => {
    console.log(`ODTS API listening on http://localhost:${config.port}/api (${config.nodeEnv})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${config.port} is already in use. Stop the other process or change PORT in backend/.env.`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

start();
