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
    this.events = ['ready', 'move'];
    this.Game = app.service('game');
  }

  async find(params) {
    const { route: { pid }, user: { id: userId } } = params;

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
    const engine = new EngineClass(JSON.parse(stateDoc.data));

    const fullState = engine.getState();
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
    const game = gameDoc.toJSON();

    const EngineClass = await loadEngine(gameDoc.kind);
    const engine = EngineClass.create();

    const stateDoc = new this.Model({
      _id: gameDoc.id,
      data: JSON.stringify(engine),
    });
    await stateDoc.save();

    engine
      .getPlayers()
      .forEach((internalPlayer, index) => {
        gameDoc.players[index].internalId = internalPlayer.id;
      });
    gameDoc.markModified('players');
    await gameDoc.save();

    this.emit('ready', { game, state: engine.getState() });

    return {};
  }

  async patch(nullId, data, params) {
    const {
      player: internalPlayerId,
      action,
      params: actionParams,
    } = data;
    const { route: { pid }, user: { id: userId } } = params;

    const gameDoc = await this.Game.Model.findById(pid);
    const game = gameDoc.toJSON();

    const isUserAPlayer = game.players.some((player) => player.user === userId);
    if (!isUserAPlayer) {
      throw new Forbidden();
    }

    const stateDoc = await this.Model.findById(pid);
    if (!stateDoc) {
      throw new NotFound();
    }

    const EngineClass = await loadEngine(game.kind);
    const engine = new EngineClass(JSON.parse(stateDoc.data));

    const player = game.players.find((p) => p.internalId === internalPlayerId);
    if (!player) {
      throw new BadRequest('Player unknown');
    }
    if (player.user !== userId) {
      throw new Forbidden('You cannot move for this player');
    }

    let diff;
    try {
      diff = engine.move(player.internalId, action, actionParams || {});
    } catch (e) {
      throw new BadRequest(`Gameplay error: ${e.message}`);
    }

    stateDoc.data = JSON.stringify(engine);
    await stateDoc.save();

    this.emit('move', { game, diff });

    if (engine.finished) {
      const scoreMap = Object.fromEntries(
        engine.getPlayers().map((p) => [p.id, p.score]),
      );

      gameDoc.players.forEach((p) => {
        p.score = scoreMap[p.internalId]; // eslint-disable-line no-param-reassign
      });
      gameDoc.markModified('players');
      await gameDoc.save();

      this.Game.emit('gameplayFinished', { id: pid });
    }

    return {};
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

  service.publish('ready', ({ game, state }) => {
    const channels = [];

    game.players.forEach((player) => {
      const channel = app.channel(player.user).send({
        id: player.internalId,
        pid: game.id,
        state: state.view(player.internalId),
      });
      channels.push(channel);
    });

    return channels;
  });

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
