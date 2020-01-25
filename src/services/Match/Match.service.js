const { disallow } = require('feathers-hooks-common');
const { BadRequest, Conflict } = require('@feathersjs/errors');
const { Service } = require('feathers-mongoose');

const addAccessFilter = require('../../hooks/authorization/addAccessFilter.js');
const checkAccess = require('../../hooks/authorization/checkAccess.js');
const checkRoles = require('../../hooks/authorization/checkRoles.js');
const setAccessControl = require('../../hooks/authorization/setAccessControl.js');
const setOwner = require('../../hooks/authorization/setOwner.js');
const validate = require('../../hooks/validate.js');

const MatchSchema = require('./Match.schema.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

class Match extends Service {
  constructor(options, app) {
    super(options, app);
    this.Game = app.service('game');
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
};

module.exports = function (app) {
  const options = {
    Model: app.get('mongooseClient').model('Match', MatchSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/match', new Match(options, app));
  const service = app.service('match');
  service.hooks(hooks);
};