const { Forbidden, Conflict, NotFound } = require('@feathersjs/errors');
const { checkAccess } = require('../../hooks/authorization.js');
const validate = require('../../hooks/validate.js');
const addPlayerSchema = require('./schemas/addPlayer.json');

const cutUser = (user) => ({ id: user.id, name: user.name });

class MatchPlayers {
  constructor(options, app) {
    this.options = options || {};
    this.matches = app.service('matches');
    this.users = app.service('users');
  }

  async find({ route }) {
    const matchDoc = await this.matches._get(route.pid);
    if (!matchDoc.players.length) {
      return [];
    }
    const { data: players } = await this.users._find({ query: { _id: { $in: matchDoc.players } } });
    const playersMap = new Map(players.map((player) => [player.id, cutUser(player)]));
    return matchDoc.players.map((_id) => playersMap.get(_id.toString()));
  }

  // join the game (only by itself)
  async create(data, { route, user }) {
    const matchDoc = await this.matches._get(route.pid);

    if (matchDoc.maxPlayers === matchDoc.players.length) {
      throw new Conflict('Maximum number of players reached');
    }

    if (matchDoc.players.some((_id) => _id.toString() === user.id)) {
      throw new Conflict('Duplicate player');
    }

    matchDoc.players.push(user.id);
    await matchDoc.save();
    return cutUser(user);
  }

  // leave the game (any player) or pull someone out from the game (allowed only to admins)
  async remove(id, { route, user }) {
    const matchDoc = await this.matches._get(route.pid);
    if (user.id !== id && user.id !== matchDoc.owner.toString()) {
      throw new Forbidden('You can delete only yourself from the game');
    }
    if (!matchDoc.players.some((_id) => _id.toString() === id)) {
      throw new NotFound('Player not found');
    }
    await matchDoc.players.pull(id);
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
