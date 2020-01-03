/* eslint-disable class-methods-use-this, no-unused-vars */
class UserAttributes {
  constructor(options) {
    this.options = options || {};
  }

  async find(params) {
    return [];
  }

  async get(id, params) {
    return {
      id, text: `A new message with ID: ${id}!`,
    };
  }

  async create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map((current) => this.create(current, params)));
    }

    return data;
  }

  async update(id, data, params) {
    return data;
  }

  async patch(id, data, params) {
    return data;
  }

  async remove(id, params) {
    return { id };
  }
}
/* eslint-enable class-methods-use-this, no-unused-vars */

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate'),
  };

  // Initialize our service with any options it requires
  app.use('/users/:userId', new UserAttributes(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('users/:userId');

  service.hooks({
    before: {},
    after: {},
    error: {},
  });
};
