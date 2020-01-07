const { Schema } = require('mongoose');
const { disallow } = require('feathers-hooks-common');
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;
const { Service } = require('feathers-mongoose');

const { checkRoles, addAccessFilter } = require('../../hooks/authorization.js');
const authenticate = require('../../hooks/authenticate.js');
const validate = require('../../hooks/validate.js');
const toJSON = require('../../hooks/toJSON.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

const schema = new Schema({
  roles: {
    type: [String],
    default: ['user'],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
  },
  googleId: {
    type: String,
  },
}, {
  timestamps: true,
  toJSON: {
    getters: true,
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      const { _id, ...rest } = ret;
      return rest;
    },
  },
});

class Users extends Service {
  async addRole(id, role) {
    const user = await this._get(id);
    if (!user.roles.includes(role)) {
      user.roles.push(role);
      await user.save();
    }
    return user.toJSON();
  }

  async removeRole(id, role) {
    const user = await this._get(id);
    if (user.roles.includes(role)) {
      user.roles = user.roles.filter((item) => item !== role);
      await user.save();
    }
    return user.toJSON();
  }
}

const hooks = {
  before: {
    find: [
      authenticate(),
      addAccessFilter({ ownerField: '_id' }),
    ],
    get: [
      authenticate(),
      addAccessFilter({ ownerField: '_id' }),
    ],
    create: [
      validate(createSchema),
      hashPassword('password'),
    ],
    update: [
      disallow(),
    ],
    patch: [
      authenticate(),
      checkRoles('admin'),
      validate(patchSchema),
      addAccessFilter({ ownerField: '_id' }),
      hashPassword('password'),
    ],
    remove: [
      disallow(),
    ],
  },

  after: {
    all: [
      toJSON(),
      protect('password', 'googleId'),
    ],
  },
};

module.exports = function (app) {
  const options = {
    Model: app.get('mongooseClient').model('users', schema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/users', new Users(options, app));

  const service = app.service('users');
  service.hooks(hooks);
};
