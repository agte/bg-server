const { disallow } = require('feathers-hooks-common');
const { protect } = require('@feathersjs/authentication-local').hooks;
const { BadRequest, Conflict } = require('@feathersjs/errors');
const { Service } = require('feathers-mongoose');
const { Schema } = require('mongoose');

const addAccessFilter = require('../../hooks/authorization/addAccessFilter.js');
const checkAccess = require('../../hooks/authorization/checkAccess.js');
const checkRoles = require('../../hooks/authorization/checkRoles.js');
const setAccessControl = require('../../hooks/authorization/setAccessControl.js');
const setOwner = require('../../hooks/authorization/setOwner.js');
const validate = require('../../hooks/validate.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

const ACLSchema = require('../../mongoose/ACLSchema.js');

const PlayerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
}, {
  _id: true,
  id: true,
  timestamps: false,
  toJSON: {
    versionKey: false,
    /* eslint-disable no-param-reassign */
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
    /* eslint-enable no-param-reassign */
  },
});

const MatchSchema = new Schema({
  game: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  status: {
    type: String,
    enum: [
      'draft',
      'gathering',
      'pending',
      'launched',
      'finished',
      'aborted',
    ],
    default: 'draft',
    index: true,
  },
  players: {
    type: [PlayerSchema],
    default: [],
  },
  minPlayers: {
    type: Number,
    required: true,
  },
  maxPlayers: {
    type: Number,
    required: true,
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
      ret.game = ret.game.toString();
      ret.owner = ret.owner.toString();
      return ret;
    },
    /* eslint-enable no-param-reassign */
  },
});

class Matches extends Service {
  constructor(options, app) {
    super(options, app);
    this.Game = app.service('games');
  }

  async _create(data, params) {
    let game;
    try {
      game = await this.Game._get(data.game);
    } catch (e) {
      throw new BadRequest('Specified game does not exist');
    }
    return super._create({
      ...data,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
    }, params);
  }

  async _patch(id, data, params) {
    const resource = params.resource || await this.get(id);
    if (resource.status !== 'draft') {
      throw new Conflict(`You cannot update a match in "${resource.status}" status`);
    }
    return super._patch(id, data, params);
  }

  async _remove(id, params) {
    const resource = params.resource || await this.get(id);
    if (resource.status === 'launched' || resource.status === 'finished') {
      throw new Conflict(`You cannot remove a match in "${resource.status}" status`);
    }
    return super._remove(id, params);
  }
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
      checkRoles('user'),
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
    Model: app.get('mongooseClient').model('matches', MatchSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/matches', new Matches(options, app));
  const service = app.service('matches')
  service.hooks(hooks);
};
