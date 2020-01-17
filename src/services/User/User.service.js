const { mongo: { ObjectId } } = require('mongoose');
const { Service } = require('feathers-mongoose');
const { disallow } = require('feathers-hooks-common');
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;

const addAccessFilter = require('../../hooks/authorization/addAccessFilter.js');
const checkAccess = require('../../hooks/authorization/checkAccess.js');
const checkRoles = require('../../hooks/authorization/checkRoles.js');
const validate = require('../../hooks/validate.js');

const UserSchema = require('./User.schema.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

class Users extends Service {
  async _create(data, params) {
    const id = new ObjectId();
    return super._create({ ...data, _id: id, owner: id }, params);
  }
}

const hooks = {
  before: {
    find: [
      checkRoles('user'),
      addAccessFilter(),
    ],
    get: [
      checkRoles('user'),
      checkAccess(),
    ],
    create: [
      validate(createSchema),
      hashPassword('password'),
    ],
    update: [
      disallow(),
    ],
    patch: [
      checkAccess(),
      validate(patchSchema),
      hashPassword('password'),
    ],
    remove: [
      disallow(),
    ],
  },

  after: {
    all: [
      protect('password'),
    ],
  },
};

module.exports = function (app) {
  const options = {
    Model: app.get('mongooseClient').model('User', UserSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/user', new Users(options, app));
  app.service('user').hooks(hooks);
};
