const { disallow } = require('feathers-hooks-common');
const { Forbidden, Conflict, NotFound } = require('@feathersjs/errors');

const checkAccess = require('../../hooks/authorization/checkAccess.js');
const validate = require('../../hooks/validate.js');

const addPlayerSchema = require('./schemas/addPlayer.json');

class GamePlayers {
  constructor(options, app) {
    this.options = options || {};
    this.Game = app.service('game');
    this.User = app.service('user');
  }

  async create(data, { route, user }) {
    const gameDoc = await this.Game.Model.findById(route.pid);
    const isOwner = user.id === gameDoc.owner.toString();

    if (gameDoc.status !== 'gathering' && !(isOwner && gameDoc.status === 'draft')) {
      throw new Conflict('Joining a game is not allowed now');
    }

    if (gameDoc.maxPlayers === gameDoc.players.length) {
      throw new Conflict('Maximum number of players reached');
    }

    gameDoc.players.push({ user: user.id, name: user.name });
    await gameDoc.save();

    this.Game.emit('patched', gameDoc.toJSON());
    return gameDoc.players[gameDoc.players.length - 1];
  }

  async remove(id, { route, user }) {
    const gameDoc = await this.Game.Model.findById(route.pid);
    const isOwner = user.id === gameDoc.owner.toString();

    if (gameDoc.status !== 'gathering' && !(isOwner && gameDoc.status === 'draft')) {
      throw new Conflict('Leaving a game is not allowed now');
    }

    const player = gameDoc.players.id(id);
    if (!player) {
      throw new NotFound('Player not found');
    }

    if (user.id === gameDoc.owner.toString() && user.id !== player.user.toString()) {
      throw new Forbidden('You cannot delete anyone except yourself from the game');
    }

    player.remove();
    await gameDoc.save();

    this.Game.emit('patched', gameDoc.toJSON());
    return { id };
  }
}

const hooks = {
  before: {
    find: [
      checkAccess(),
    ],
    create: [
      checkAccess('read'),
      validate(addPlayerSchema),
    ],
    remove: [
      checkAccess('read'),
    ],
    patch: [
      disallow('external'),
    ],
  },
};

module.exports = function (app) {
  app.use('/game/:pid/players', new GamePlayers({ parent: 'game' }, app));
  const service = app.service('game/:pid/players');
  service.hooks(hooks);
  service.publish('created', () => null);
  service.publish('removed', () => null);
};
