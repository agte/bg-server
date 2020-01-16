const { Schema, mongo: { ObjectId } } = require('mongoose');
const { Service } = require('feathers-mongoose');
const { disallow } = require('feathers-hooks-common');
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;

const addAccessFilter = require('../../hooks/authorization/addAccessFilter.js');
const checkAccess = require('../../hooks/authorization/checkAccess.js');
const checkRoles = require('../../hooks/authorization/checkRoles.js');
const validate = require('../../hooks/validate.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

const modelSchema = new Schema({
  roles: {
    type: [String],
    default: ['user'],
  },
  name: {
    type: String,
    minlength: 2,
    maxlength: 25,
    required: true,
    unique: true,
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
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
  },
}, {
  timestamps: true,
  toJSON: {
    versionKey: false,
    /* eslint-disable no-param-reassign */
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      ret.owner = ret.owner.toString();
      return ret;
    },
    /* eslint-enable no-param-reassign */
  },
});

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
      checkRoles('guest'),
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
    Model: app.get('mongooseClient').model('users', modelSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/users', new Users(options, app));
  app.service('users').hooks(hooks);
};
