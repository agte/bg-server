const { disallow } = require('feathers-hooks-common');
const { BadRequest, Conflict } = require('@feathersjs/errors');
const { Service } = require('feathers-mongoose');

const addAccessFilter = require('../../hooks/authorization/addAccessFilter.js');
const checkAccess = require('../../hooks/authorization/checkAccess.js');
const checkRoles = require('../../hooks/authorization/checkRoles.js');
const setAccessControl = require('../../hooks/authorization/setAccessControl.js');
const setOwner = require('../../hooks/authorization/setOwner.js');
const validate = require('../../hooks/validate.js');

const GameSchema = require('./Game.schema.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

class Game extends Service {
  constructor(options, app) {
    super(options, app);
    this.GameKind = app.service('gameKind');
  }

  async _create(data, params) {
    let kind;
    try {
      kind = await this.GameKind._get(data.kind);
    } catch (e) {
      throw new BadRequest('Specified kind does not exist');
    }
    return super._create({
      ...data,
      minPlayers: kind.minPlayers,
      maxPlayers: kind.maxPlayers,
    }, params);
  }

  async _patch(id, data, params) {
    const resource = params.resource || await this.get(id);
    if (resource.status !== 'draft') {
      throw new Conflict(`You cannot update a game in "${resource.status}" status`);
    }
    return super._patch(id, data, params);
  }

  async _remove(id, params) {
    const resource = params.resource || await this.get(id);
    if (resource.status === 'launched' || resource.status === 'finished') {
      throw new Conflict(`You cannot remove a game in "${resource.status}" status`);
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
};

module.exports = function (app) {
  const options = {
    Model: app.get('mongooseClient').model('Game', GameSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/game', new Game(options, app));
  const service = app.service('game');
  service.hooks(hooks);
};
