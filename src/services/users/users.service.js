const { Schema } = require('mongoose');
const { Service } = require('feathers-mongoose');
const { disallow } = require('feathers-hooks-common');
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;

const { checkRoles, addAccessFilter } = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');
const toJSON = require('../../hooks/toJSON.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

const modelSchema = new Schema({
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
    /* eslint-disable no-param-reassign */
    transform: (doc, ret) => {
      delete ret._id;
      return ret;
    },
    /* eslint-enable no-param-reassign */
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
      checkRoles('user'),
      addAccessFilter({ ownerField: '_id' }),
    ],
    get: [
      checkRoles('user'),
      addAccessFilter({ ownerField: '_id' }),
    ],
    create: [
      checkRoles('guest'),
      validate(createSchema),
      hashPassword('password'),
    ],
    update: [
      disallow(),
    ],
    patch: [
      checkRoles('admin'),
      validate(patchSchema),
      hashPassword('password'),
    ],
    remove: [
      disallow(),
    ],
  },

  after: {
    all: [
      toJSON(),
      protect('password'),
    ],
  },
};

module.exports = function (app) {
  const options = {
    Model: app.get('mongooseClient').model('users', modelSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/users', new Users(options, app));
  app.service('users').hooks(hooks);
};
