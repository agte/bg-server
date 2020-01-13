const { Conflict, NotFound } = require('@feathersjs/errors');
const { checkAccess, checkRoles } = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');
const createRoleSchema = require('./schemas/createRole.json');

class UserRoles {
  constructor(options, app) {
    this.options = options || {};
    this.users = app.service('users');
  }

  async find({ route }) {
    const userDoc = await this.users._get(route.pid);
    return userDoc.roles.map((role) => ({ id: role }));
  }

  async create({ id }, { route }) {
    const userDoc = await this.users._get(route.pid);
    if (userDoc.roles.includes(id)) {
      throw new Conflict('Duplicate role');
    }
    userDoc.roles.push(id);
    await userDoc.save();
    return { id };
  }

  async remove(id, { route }) {
    const userDoc = await this.users._get(route.pid);
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
    find: [
      checkAccess(),
    ],
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
  app.service('users/:pid/roles').hooks(hooks);
};
