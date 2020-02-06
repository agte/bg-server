const { disallow } = require('feathers-hooks-common');
const { BadRequest, Forbidden, NotFound } = require('@feathersjs/errors');

const checkRoles = require('../../hooks/authorization/checkRoles.js');
const validate = require('../../hooks/validate.js');
const GameStateSchema = require('./GameState.schema.js');

const makeMoveSchema = require('./schemas/makeMove.json');

// Позже вынести это в отдельный файл и подгружать при запуске приложения
const engines = {
  'tic-tac-toe': '@agte/bg-tic-tac-toe',
};

const loadEngine = async (name) => {
  if (!engines[name]) {
    throw new Error('Unknown game engine');
  }
  return (await import(engines[name])).default;
};

class GameState {
  constructor(options, app) {
    this.options = options || {};
    this.Model = this.options.Model;
    this.events = ['move'];
    this.Game = app.service('game');
  }

  async find({ route: { pid }, user: { id: userId } }) {
    const game = await this.Game.get(pid);

    const isUserAPlayer = game.players.some((player) => player.user === userId);
    if (!isUserAPlayer) {
      throw new Forbidden();
    }

    const stateDoc = await this.Model.findById(pid);
    if (!stateDoc) {
      return new NotFound();
    }

    const EngineClass = await loadEngine(game.kind);
    const gameMachine = new EngineClass(JSON.parse(stateDoc.data));

    const fullState = gameMachine.state;
    const views = game.players
      .filter((player) => player.user === userId)
      .map((player) => ({
        id: player.internalId,
        state: fullState.view(player.internalId),
      }));
    return views;
  }

  async create(emptyData, { route: { pid } }) {
    const gameDoc = await this.Game.Model.findById(pid);

    const EngineClass = await loadEngine(gameDoc.kind);
    const gameMachine = new EngineClass();

    const stateDoc = new this.Model({
      _id: gameDoc.id,
      data: JSON.stringify(gameMachine),
    });
    await stateDoc.save();

    Array
      .from(gameMachine.players.keys())
      .forEach((internalPlayerId, index) => {
        gameDoc.players[index].internalId = internalPlayerId;
      });
    gameDoc.markModified('players');
    await gameDoc.save();

    return {};
  }

  async patch(nullId, { player: internalPlayerId, action, options = null }, { route: { pid }, user: { id: userId } }) {
    const game = await this.Game.get(pid);

    const isUserAPlayer = game.players.some((player) => player.user === userId);
    if (!isUserAPlayer) {
      throw new Forbidden();
    }

    const stateDoc = await this.Model.findById(pid);
    if (!stateDoc) {
      throw new NotFound();
    }

    const EngineClass = await loadEngine(game.kind);
    const gameMachine = new EngineClass(JSON.parse(stateDoc.data));

    const player = game.players.find((p) => p.internalId === internalPlayerId);
    if (!player) {
      throw new BadRequest('Player unknown');
    }
    if (player.user !== userId) {
      throw new Forbidden('You cannot move for this player');
    }

    let diff;
    try {
      diff = gameMachine.move(player.internalId, action, options || {});
    } catch (e) {
      throw new BadRequest(`Gameplay error: ${e.message}`);
    }
    this.emit('move', { game, diff });

    return {
      id: player.internalId,
      diff: diff.view(player.internalId),
    };
  }
}

const hooks = {
  before: {
    find: [
      checkRoles('user'),
    ],
    create: [
      disallow('external'),
    ],
    patch: [
      checkRoles('user'),
      validate(makeMoveSchema),
    ],
  },
};

module.exports = function (app) {
  const options = {
    parent: 'game',
    Model: app.get('mongooseClient').model('GameState', GameStateSchema),
  };
  app.use('/game/:pid/state', new GameState(options, app));
  const service = app.service('game/:pid/state');
  service.hooks(hooks);

  service.publish('created', () => null);
  service.publish('patched', () => null);

  service.publish('move', ({ game, diff }) => {
    const channels = [];

    game.players.forEach((player) => {
      const channel = app.channel(player.user).send({
        id: player.internalId,
        pid: game.id,
        diff: diff.view(player.internalId),
      });
      channels.push(channel);
    });

    return channels;
  });
};
