const { BadRequest, NotFound } = require('@feathersjs/errors');
const { checkAccess, checkRoles } = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');
const createRoleSchema = require('./schemas/createRole.json');

class UserRoles {
  constructor(options, app) {
    this.options = options || {};
    this.users = app.service('users');
  }

  async find({ route }) {
    const user = await this.users._get(route.pid);
    return user.roles.map((role) => ({ id: role }));
  }

  async create({ id }, { route }) {
    const user = await this.users._get(route.pid);
    if (user.roles.includes(id)) {
      throw new BadRequest('Duplicate id');
    }
    user.roles.push(id);
    await user.save();
    return { id };
  }

  async remove(id, { route }) {
    const user = await this.users._get(route.pid);
    if (!user.roles.includes(id)) {
      throw new NotFound();
    }
    user.roles.pull(id);
    await user.save();
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
