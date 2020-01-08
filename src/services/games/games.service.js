const { Schema } = require('mongoose');
const { Service } = require('feathers-mongoose');
const { disallow } = require('feathers-hooks-common');
const { protect } = require('@feathersjs/authentication-local').hooks;

const {
  checkRoles,
  addAccessFilter,
  checkAccess,
  setOwner,
  setAccessControl,
  ACLSchema,
} = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

const modelSchema = new Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  minPlayers: {
    type: Number,
    min: 1,
    default: 1,
  },
  maxPlayers: {
    type: Number,
    min: 0,
    default: 0,
  },
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  acl: ACLSchema,
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

class Games extends Service {
}

const hooks = {
  before: {
    find: [
      addAccessFilter(),
    ],
    get: [
      checkAccess(),
    ],
    create: [
      checkRoles('designer'),
      validate(createSchema),
      setOwner(),
      setAccessControl('read', 'user'),
    ],
    update: [
      disallow(),
    ],
    patch: [
      checkAccess(),
      validate(patchSchema),
    ],
    remove: [
      checkAccess(),
    ],
  },
  after: {
    all: [
      protect('acl'),
    ],
  },
};

module.exports = function (app) {
  const options = {
    Model: app.get('mongooseClient').model('games', modelSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/games', new Games(options, app));
  app.service('games').hooks(hooks);
};
