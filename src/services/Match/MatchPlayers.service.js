const { Forbidden, Conflict, NotFound } = require('@feathersjs/errors');

const checkAccess = require('../../hooks/authorization/checkAccess.js');
const validate = require('../../hooks/validate.js');

const addPlayerSchema = require('./schemas/addPlayer.json');

class MatchPlayers {
  constructor(options, app) {
    this.options = options || {};
    this.Match = app.service('match');
    this.User = app.service('user');
  }

  async create(data, { route, user }) {
    const matchDoc = await this.Match.Model.findById(route.pid);
    const isOwner = user.id === matchDoc.owner.toString();

    if (matchDoc.status !== 'gathering' && !(isOwner && matchDoc.status === 'draft')) {
      throw new Conflict('Joining a match is not allowed now');
    }

    if (matchDoc.maxPlayers === matchDoc.players.length) {
      throw new Conflict('Maximum number of players reached');
    }

    if (matchDoc.players.id(user.id)) {
      throw new Conflict('Duplicate player');
    }

    matchDoc.players.push({ _id: user.id, name: user.name });
    await matchDoc.save();

    this.Match.emit('patched', matchDoc.toJSON());
    return matchDoc.players[matchDoc.players.length - 1];
  }

  async remove(id, { route, user }) {
    const matchDoc = await this.Match.Model.findById(route.pid);
    const isOwner = user.id === matchDoc.owner.toString();

    if (matchDoc.status !== 'gathering' && !(isOwner && matchDoc.status === 'draft')) {
      throw new Conflict('Leaving a match is not allowed now');
    }

    if (user.id === matchDoc.owner.toString() && user.id !== id) {
      throw new Forbidden('You cannot delete anyone except yourself from the match');
    }

    const player = matchDoc.players.id(id);
    if (!player) {
      throw new NotFound('Player not found');
    }

    player.remove();
    await matchDoc.save();

    this.Match.emit('patched', matchDoc.toJSON());
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
  app.use('/match/:pid/players', new MatchPlayers({ parent: 'match' }, app));
  const service = app.service('match/:pid/players');
  service.hooks(hooks);
  service.publish('created', () => null);
  service.publish('removed', () => null);
};