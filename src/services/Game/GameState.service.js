const { disallow } = require('feathers-hooks-common');
const { Forbidden } = require('@feathersjs/errors');

const checkRoles = require('../../hooks/authorization/checkRoles.js');
const GameStateSchema = require('./GameState.schema.js');

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
      return [];
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

  // async patch(data, { route: { pid } }) {
  // }
}

const hooks = {
  before: {
    find: [
      checkRoles('user'),
    ],
    create: [
      disallow('external'),
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
  // service.publish('patched', () => null);
};
