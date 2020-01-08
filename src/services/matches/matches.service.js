const { Schema, mongo: { ObjectId } } = require('mongoose');
const { Service } = require('feathers-mongoose');
const { disallow } = require('feathers-hooks-common');
const { BadRequest, Forbidden } = require('@feathersjs/errors');
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
    ],
    default: 'draft',
    index: true,
  },
  players: {
    type: [Schema.Types.ObjectId],
    default: [],
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
      ret.players = ret.players.map((player) => player.toString());
      return ret;
    },
    /* eslint-enable no-param-reassign */
  },
});

class Matches extends Service {
  constructor(options, app) {
    super(options, app);
    this.games = app.service('games');
  }

  async _create(data, params) {
    try {
      await this.games._get(data.game);
    } catch (e) {
      throw new BadRequest('Specified game does not exist');
    }
    const players = [ObjectId(params.user.id)];
    return super._create({ ...data, players }, params);
  }

  async _patch(id, data, params) {
    const resource = params.resource || await this.get(id);
    if (resource.status !== 'draft') {
      throw new Forbidden(`You cannot update a match in "${resource.status}" status`);
    }
    return super._patch(id, data, params);
  }

  async _remove(id, params) {
    const resource = params.resource || await this.get(id);
    if (resource.status === 'launched' || resource.status === 'finished') {
      throw new Forbidden(`You cannot remove a match in "${resource.status}" status`);
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
    Model: app.get('mongooseClient').model('matches', modelSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/matches', new Matches(options, app));
  app.service('matches').hooks(hooks);
};
