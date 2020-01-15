const { Conflict } = require('@feathersjs/errors');
const { checkAccess } = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');
const changeStatusSchema = require('./schemas/changeStatus.json');

const allowedSwitches = {
  draft: ['gathering'],
  pending: ['gathering', 'launched'],
  gathering: ['pending'],
  launched: ['aborted'],
};

class MatchStatus {
  constructor(options, app) {
    this.options = options || {};
    this.matches = app.service('matches');
    this.matchPlayers = app.service('matches/:pid/players');
  }

  async update(id, { value: newStatus }, { route }) {
    const matchDoc = await this.matches._get(route.pid);
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
  app.service('matches/:pid/status').hooks(hooks);
};
