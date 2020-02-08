const { Forbidden, Conflict, NotFound } = require('@feathersjs/errors');

const checkAccess = require('../../hooks/authorization/checkAccess.js');
const validate = require('../../hooks/validate.js');

const addPlayerSchema = require('./schemas/addPlayer.json');

class GamePlayers {
  constructor(options, app) {
    this.options = options || {};
    this.Game = app.service(options.parent);
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

    const playerDoc = gameDoc.players.create({ user: user.id, name: user.name });
    gameDoc.players.push(playerDoc);
    await gameDoc.save();

    this.Game.emit('patched', gameDoc.toJSON());
    return playerDoc;
  }

  async remove(id, { route, user }) {
    const gameDoc = await this.Game.Model.findById(route.pid);
    const isOwner = user.id === gameDoc.owner.toString();

    if (gameDoc.status !== 'gathering' && !(isOwner && gameDoc.status === 'draft')) {
      throw new Conflict('Leaving a game is not allowed now');
    }

    const playerDoc = gameDoc.players.id(id);
    if (!playerDoc) {
      throw new NotFound('Player not found');
    }

    if (user.id === gameDoc.owner.toString() && user.id !== playerDoc.user.toString()) {
      throw new Forbidden('You cannot delete anyone except yourself from the game');
    }

    playerDoc.remove();
    await gameDoc.save();

    this.Game.emit('patched', gameDoc.toJSON());
    return playerDoc;
  }
}

const hooks = {
  before: {
    create: [
      checkAccess('read'),
      validate(addPlayerSchema),
    ],
    remove: [
      checkAccess('read'),
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
