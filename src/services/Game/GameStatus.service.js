const { Conflict } = require('@feathersjs/errors');

const checkAccess = require('../../hooks/authorization/checkAccess.js');
const validate = require('../../hooks/validate.js');
const logger = require('../../logger');

const changeStatusSchema = require('./schemas/changeStatus.json');

const allowedSwitches = {
  draft: ['gathering'],
  gathering: ['running', 'draft'],
  running: ['finished', 'aborted'],
  finished: [],
  aborted: [],
};

class GameStatus {
  constructor(options, app) {
    this.options = options || {};
    this.Game = app.service('game');
    this.GameState = app.service('game/:pid/state');

    this.Game.on('gameplayFinished', ({ id }) => {
      this.update(null, { value: 'finished' }, { route: { pid: id } })
        .catch((e) => {
          logger.error(e);
        });
    });
  }

  async update(id, { value: newStatus }, { route: { pid } }) {
    let gameDoc = await this.Game.Model.findById(pid);
    const currentStatus = gameDoc.status;

    if (!allowedSwitches[currentStatus].includes(newStatus)) {
      throw new Conflict(`You cannot switch status from ${currentStatus} to ${newStatus}`);
    }

    if (newStatus === 'running') {
      if (gameDoc.players.length < gameDoc.minPlayers) {
        throw new Conflict('There are not enough players');
      }

      // TODO Пересмотреть это место.
      await this.GameState.create({}, { route: { pid } });
      // заново считываем из БД, так как GameState мог там что-то поменять.
      gameDoc = await this.Game.Model.findById(pid);
    }

    gameDoc.status = newStatus;
    await gameDoc.save();

    this.Game.emit('patched', gameDoc.toJSON());
    return { value: newStatus };
  }
}

const hooks = {
  before: {
    update: [
      checkAccess(),
      validate(changeStatusSchema),
    ],
  },
};

module.exports = function (app) {
  app.use('/game/:pid/status', new GameStatus({ parent: 'game' }, app));
  const service = app.service('game/:pid/status');
  service.hooks(hooks);
  service.publish('updated', () => null);
};
