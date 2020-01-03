const { disallow } = require('feathers-hooks-common');
const authenticate = require('../../hooks/authenticate.js');
const { checkRoles } = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');
const createRoleSchema = require('./schemas/createRole.json');

/* eslint-disable class-methods-use-this, no-unused-vars */
class UserRoles {
  constructor(options, app) {
    this.options = options || {};
    this.users = app.service('users');
  }

  async find(params) {
    const user = await this.users.get(params.route.userId);
    return user.roles.map(role => ({ id: role }));
  }

  async create({ id }, params) {
    await this.users.addRole(params.route.userId, id);
    return { id };
  }

  async remove(id, params) {
    await this.users.removeRole(params.route.userId, id);
    return { id };
  }
}
/* eslint-enable class-methods-use-this, no-unused-vars */

module.exports = function (app) {
  app.use('/users/:userId/roles', new UserRoles({}, app));
  app.service('users/:userId/roles').hooks({
    before: {
      create: [
        authenticate(),
        checkRoles('admin'),
        validate(createRoleSchema),
      ],
      remove: [
        authenticate(),
        checkRoles('admin'),
      ],
    },
    after: {},
    error: {},
  });
};
