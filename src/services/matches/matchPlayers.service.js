const { Forbidden, Conflict, NotFound } = require('@feathersjs/errors');
const { checkAccess } = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');
const addPlayerSchema = require('./schemas/addPlayer.json');

const playerInfo = (user) => ({ id: user.id, name: user.name });

class MatchPlayers {
  constructor(options, app) {
    this.options = options || {};
    this.matches = app.service('matches');
    this.matchStatus = app.service('matches/:pid/status');
    this.users = app.service('users');
  }

  async find({ route }) {
    const matchDoc = await this.matches._get(route.pid);
    if (!matchDoc.players.length) {
      return [];
    }
    const { data: players } = await this.users._find({
      query: { _id: { $in: matchDoc.players } },
    });
    const playersMap = new Map(
      players.map((player) => [player.id, playerInfo(player)]),
    );
    return matchDoc.players.map((_id) => playersMap.get(_id.toString()));
  }

  // join the game (only itself)
  async create(data, { route, user }) {
    const matchDoc = await this.matches._get(route.pid);

    if (matchDoc.status !== 'gathering') {
      throw new Conflict('Joining a match is not allowed now');
    }

    if (matchDoc.maxPlayers === matchDoc.players.length) {
      throw new Conflict('Maximum number of players reached');
    }

    if (matchDoc.players.some((_id) => _id.toString() === user.id)) {
      throw new Conflict('Duplicate player');
    }

    matchDoc.players.push(user.id);
    await matchDoc.save();
    return playerInfo(user);
  }

  // leave the game (any player) or pull someone out from the game (allowed only to admins)
  async remove(id, { route, user }) {
    const matchDoc = await this.matches._get(route.pid);

    if (matchDoc.status !== 'gathering') {
      throw new Conflict('Leaving a match is not allowed now');
    }

    if (user.id === matchDoc.owner.toString()) {
      if (user.id === id) {
        throw new Forbidden('You cannot delete owner of the match');
      }
    } else {
      if (user.id !== id) { // eslint-disable-line no-lonely-if
        throw new Forbidden('You cannot delete anyone except yourself from the match');
      }
    }

    if (!matchDoc.players.some((_id) => _id.toString() === id)) {
      throw new NotFound('Player not found');
    }

    matchDoc.players.pull(id);
    await matchDoc.save();
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
  },
};

module.exports = function (app) {
  app.use('/matches/:pid/players', new MatchPlayers({ parent: 'matches' }, app));
  app.service('matches/:pid/players').hooks(hooks);
};
