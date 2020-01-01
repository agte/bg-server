const mongoose = require('mongoose');
const logger = require('./logger');

module.exports = function (app) {
  const mongooseConnect = mongoose.connect(
    app.get('mongodb'),
    {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Mongoose bug: custom connectTimeoutMS doesn't work with useUnifiedTopology=true
      // See https://stackoverflow.com/questions/59195832/connecttimeoutms-in-mongoose-doesnt-work
      connectTimeoutMS: 2000,
      autoIndex: app.get('createIndexes'),
    },
  ).catch((err) => {
    logger.error(err);
    process.exit(1);
  });

  mongoose.Promise = global.Promise;

  app.set('mongooseClient', mongoose);
  app.set('mongooseConnect', mongooseConnect);
};
