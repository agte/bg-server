const { Schema } = require('mongoose');
const { Service } = require('feathers-mongoose');
const { disallow } = require('feathers-hooks-common');

const { checkRoles, addAccessFilter, setOwner } = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');
const toJSON = require('../../hooks/toJSON.js');

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
    default: 1,
  },
  maxPlayers: {
    type: Number,
    default: 0,
  },
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
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
      ret.owner = ret.owner.toString();
      return ret;
    },
    /* eslint-enable no-param-reassign */
  },
});

const Games = class Games extends Service {
};

const hooks = {
  before: {
    find: [
      checkRoles('user'),
    ],
    get: [
      checkRoles('user'),
    ],
    create: [
      checkRoles('designer'),
      validate(createSchema),
      setOwner(),
    ],
    update: [
      disallow(),
    ],
    patch: [
      checkRoles('designer'),
      addAccessFilter(),
      validate(patchSchema),
    ],
    remove: [
      checkRoles('designer'),
      addAccessFilter(),
    ],
  },

  after: {
    all: [
      toJSON(),
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
