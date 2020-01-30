const { Conflict } = require('@feathersjs/errors');

const checkAccess = require('../../hooks/authorization/checkAccess.js');
const validate = require('../../hooks/validate.js');

const changeStatusSchema = require('./schemas/changeStatus.json');

const allowedSwitches = {
  draft: ['gathering'],
  gathering: ['launched', 'draft'],
  launched: ['finished', 'aborted'],
  finished: [],
  aborted: [],
};

class GameStatus {
  constructor(options, app) {
    this.options = options || {};
    this.Game = app.service('game');
  }

  async update(id, { value: newStatus }, { route }) {
    const gameDoc = await this.Game.Model.findById(route.pid);
    const currentStatus = gameDoc.status;

    if (!allowedSwitches[currentStatus].includes(newStatus)) {
      throw new Conflict(`You cannot switch status from ${currentStatus} to ${newStatus}`);
    }

    if (currentStatus === 'gathering' && newStatus === 'launched'
      && gameDoc.players.length < gameDoc.minPlayers
    ) {
      throw new Conflict('There are not enough players');
    }

    gameDoc.status = newStatus;
    await gameDoc.save();

    this.Game.emit('patched', gameDoc.toJSON());
    this.Game.emit('statusChanged', {
      from: currentStatus,
      to: newStatus,
      document: gameDoc,
      resource: gameDoc.toJSON(),
    });
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
