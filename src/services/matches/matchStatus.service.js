const { Conflict } = require('@feathersjs/errors');

const checkAccess = require('../../hooks/authorization/checkAccess.js');
const validate = require('../../hooks/validate.js');

const changeStatusSchema = require('./schemas/changeStatus.json');

const allowedSwitches = {
  draft: ['gathering'],
  gathering: ['draft', 'pending'],
  pending: ['gathering', 'launched'],
  launched: ['aborted'],
};

class MatchStatus {
  constructor(options, app) {
    this.options = options || {};
    this.Match = app.service('matches');
  }

  async update(id, { value: newStatus }, { route }) {
    const matchDoc = await this.Match._get(route.pid);
    const currentStatus = matchDoc.status;

    if (!allowedSwitches[currentStatus].includes(newStatus)) {
      throw new Conflict(`You cannot switch status from ${currentStatus} to ${newStatus}`);
    }

    if (currentStatus === 'gathering' && newStatus === 'pending'
        && matchDoc.players.length < matchDoc.minPlayers
    ) {
      throw new Conflict('There are not enough players');
    }

    matchDoc.status = newStatus;
    await matchDoc.save();

    this.Match.emit('patched', matchDoc.toJSON());
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
  app.use('/matches/:pid/status', new MatchStatus({ parent: 'matches' }, app));
  const service = app.service('matches/:pid/status');
  service.hooks(hooks);
  service.publish('updated', () => null);
};
