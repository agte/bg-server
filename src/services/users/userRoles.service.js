const { checkRoles } = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');
const createRoleSchema = require('./schemas/createRole.json');

class UserRoles {
  constructor(options, app) {
    this.options = options || {};
    this.users = app.service('users');
  }

  async find(params) {
    const user = await this.users.get(params.route.userId);
    return user.roles.map((role) => ({ id: role }));
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

const hooks = {
  before: {
    all: [
      checkRoles('admin'),
    ],
    create: [
      validate(createRoleSchema),
    ],
  },
};

module.exports = function (app) {
  app.use('/users/:userId/roles', new UserRoles({}, app));
  app.service('users/:userId/roles').hooks(hooks);
};
