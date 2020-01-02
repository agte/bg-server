// Initializes the `matches` service on path `/matches`
const { Matches } = require('./matches.class.js');
const createModel = require('./matches.model.js');
const hooks = require('./matches.hooks.js');

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('/matches', new Matches(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('matches');

  service.hooks(hooks);
};
