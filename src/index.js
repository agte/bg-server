/* eslint-disable no-console */
const logger = require('./logger');
const app = require('./app');

const hostname = app.get('host');
const port = app.get('port');

// TODO: remove this crutch in Feathers#v5
// See https://github.com/feathersjs/feathers/issues/509#issuecomment-519139786
logger.info('Waiting for a mongodb connection to be established...');
app.get('mongooseConnect').then(() => {
  const server = app.listen(port, hostname);
  process.on('unhandledRejection', (reason, p) => logger.error('Unhandled Rejection at: Promise ', p, reason));
  server.on('listening', async () => {
    logger.info('Feathers application started on http://%s:%d', hostname, port);
  });
});
