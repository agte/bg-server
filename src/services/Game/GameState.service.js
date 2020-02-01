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

/**
 * @param {Array.<Object>} gamePlayers [{ id: ..., user: ..., name: ... }, ...]
 * @param {Array.<Object>} innerPlayers [{ id: ..., score: ... }]
 * @return {Map.<string, Array.<string>>} { userId1: [innerPlayerId1, innerPlayerId5], userId2: [...], ... }
 */
/* eslint-disable arrow-body-style */
const mapUsersToPlayers = (gamePlayers, innerPlayers) => {
  return gamePlayers.reduce((map, gamePlayer, index) => {
    const innerPlayer = innerPlayers[index];
    if (!innerPlayer) {
      // It will never happen until someone breaks DB
      return map;
    }

    if (!map.has(gamePlayer.user)) {
      map.set(gamePlayer.user, []);
    }
    map.get(gamePlayer.user).push(innerPlayer.id);
    return map;
  }, new Map());
};
/* eslint-enable arrow-body-style */

const getUserStates = (userId, gamePlayers, gameMachine) => {
  const innerPlayers = gameMachine.players.toArray();
  const fullState = gameMachine.state;

  const userMap = mapUsersToPlayers(gamePlayers, innerPlayers);
  const playersIds = userMap.get(userId);
  return playersIds.map((playerId) => ({ id: playerId, state: fullState.view(playerId) }));
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

    const userStates = getUserStates(userId, game.players, gameMachine);
    return userStates;
  }

  async create(emptyData, { route: { pid } }) {
    const game = await this.Game.get(pid);

    const EngineClass = await loadEngine(game.kind);
    const gameMachine = new EngineClass();

    const stateDoc = new this.Model({
      _id: game.id,
      data: JSON.stringify(gameMachine),
    });
    await stateDoc.save();

    return {};
  }

  async patch(nullId, { player: innerPlayerId, action, options = null }, { route: { pid }, user: { id: userId } }) {
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

    const index = gameMachine.players.toArray().findIndex((player) => player.id === innerPlayerId);
    if (index === -1) {
      throw new BadRequest('Player unknown');
    }
    if (!game.players[index]) {
      throw new Error('Something strange happend');
    }
    if (game.players[index].user !== userId) {
      throw new Forbidden('You cannot move for this player');
    }

    let diff;
    try {
      diff = gameMachine.move(innerPlayerId, action, options || {});
    } catch (e) {
      throw new BadRequest(`Gameplay error: ${e.message}`);
    }
    this.emit('move', {
      game,
      gameMachine,
      diff,
    });

    return {
      id: innerPlayerId,
      diff: diff.view(innerPlayerId),
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

  service.publish('move', ({ game, gameMachine, diff }) => {
    const userMap = mapUsersToPlayers(game.players, gameMachine.players.toArray());
    const channels = [];

    console.log(userMap);
    userMap.forEach((playersIds, userId) => {
      playersIds.forEach((playerId) => {
        const channel = app.channel(userId).send({
          id: playerId,
          pid: game.id,
          diff: diff.view(playerId),
        });
        channels.push(channel);
      });
    });
    return channels;
  });
};
