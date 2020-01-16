const { Conflict, NotFound } = require('@feathersjs/errors');

const checkRoles = require('../../hooks/authorization/checkRoles.js');
const validate = require('../../hooks/validate.js');

const createRoleSchema = require('./schemas/createRole.json');

class UserRoles {
  constructor(options, app) {
    this.options = options || {};
    this.User = app.service('users');
  }

  async create({ id }, { route }) {
    const userDoc = await this.User._get(route.pid);
    if (userDoc.roles.includes(id)) {
      throw new Conflict('Duplicate role');
    }
    userDoc.roles.push(id);
    await userDoc.save();
    return { id };
  }

  async remove(id, { route }) {
    const userDoc = await this.User._get(route.pid);
    if (!userDoc.roles.includes(id)) {
      throw new NotFound('Role not found');
    }
    userDoc.roles.pull(id);
    await userDoc.save();
    return { id };
  }
}

const hooks = {
  before: {
    create: [
      checkRoles('admin'),
      validate(createRoleSchema),
    ],
    remove: [
      checkRoles('admin'),
    ],
  },
};

module.exports = function (app) {
  app.use('/users/:pid/roles', new UserRoles({ parent: 'users' }, app));
  const service = app.service('users/:pid/roles');
  service.hooks(hooks);
  service.publish('created', () => null);
  service.publish('removed', () => null);
};
