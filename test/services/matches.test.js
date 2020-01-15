const assert = require('assert');
const reset = require('../reset.js');
const app = require('../../src/app.js');

const User = app.service('users');
const Game = app.service('games');
const Match = app.service('matches');
const MatchPlayers = app.service('matches/:pid/players');
const MatchStatus = app.service('matches/:pid/status');

const FAKE_ID = '000000000000000000000000';

let userA;
let userB;
let userC;
let game;
let match;
let requestParams;

describe('Matches', () => {
  before(async () => {
    await reset(app);
    userA = await User.create({ name: 'AAA', email: 'AAA@mail.com', password: '123123' });
    userB = await User.create({ name: 'BBB', email: 'BBB@mail.com', password: '123123' });
    userC = await User.create({ name: 'CCC', email: 'CCC@mail.com', password: '123123' });
    game = await Game.create({
      name: 'Tic-Tac-Toe',
      engine: 'tic-tac-toe',
      minPlayers: 2,
      maxPlayers: 2,
    });
  });

  describe('Draft', () => {
    it('checks the specified game', async () => {
      try {
        await Match.create({ game: FAKE_ID }, { provider: 'test', user: userA });
        assert.fail();
      } catch (e) {
        assert.equal(e.code, 400);
      }
    });

    it('creates a match', async () => {
      match = await Match.create({ game: game.id }, { provider: 'test', user: userA });
      assert.equal(match.game, game.id);
      assert.equal(match.status, 'draft');
      assert.equal(match.owner, userA.id);
      assert.equal(match.minPlayers, game.minPlayers);
      assert.equal(match.maxPlayers, game.maxPlayers);
      requestParams = {
        userA: { route: { pid: match.id }, provider: 'test', user: userA },
        userB: { route: { pid: match.id }, provider: 'test', user: userB },
        userC: { route: { pid: match.id }, provider: 'test', user: userC },
      };
    });
  });

  describe('Gathering', () => {
    it('owner switches his match to "gathering" status', async () => {
      await MatchStatus.update(null, { value: 'gathering' }, requestParams.userA);
      match = await Match.get(match.id);
      assert.equal(match.status, 'gathering');
    });

    it('no one can join the match twice', async () => {
      try {
        await MatchPlayers.create({}, requestParams.userA);
        assert.fail();
      } catch (e) {
        assert.equal(e.code, 409);
      }
    });

    it('another user joins the match', async () => {
      const player = await MatchPlayers.create({}, requestParams.userB);
      assert.equal(player.id, userB.id);
      assert.equal(player.name, userB.name);
    });

    it('no one can join the match as extra player', async () => {
      try {
        await MatchPlayers.create({}, requestParams.userC);
        assert.fail();
      } catch (e) {
        assert.equal(e.code, 409);
      }
    });

    it('shows a match\'s players', async () => {
      const players = await MatchPlayers.find(requestParams.userA);
      assert.equal(players[0].id, userA.id);
      assert.equal(players[0].name, userA.name);
      assert.ok(!players[0].password);
      assert.equal(players[1].id, userB.id);
      assert.equal(players[1].name, userB.name);
    });

    it('owner cannot leave his match', async () => {
      try {
        await MatchPlayers.remove(userA.id, requestParams.userA);
        assert.fail();
      } catch (e) {
        assert.equal(e.code, 403);
      }
    });

    it('another user leaves the match', async () => {
      await MatchPlayers.remove(userB.id, requestParams.userB);
      const players = await MatchPlayers.find(requestParams.userA);
      assert.equal(players.length, 1);
    });
  });

  describe('Pending', () => {
    it('owner cannot switch to "pending" status if there are not enough players', async () => {
      try {
        await MatchStatus.update(null, { value: 'pending' }, requestParams.userA);
        assert.fail();
      } catch (e) {
        assert.equal(e.code, 409);
      }
    });

    it('owner switches his match to "pending" status', async () => {
      await MatchPlayers.create({}, requestParams.userC);
      await MatchStatus.update(null, { value: 'pending' }, requestParams.userA);
      match = await Match.get(match.id);
      assert.equal(match.status, 'pending');
    });

    it('no one can leave match in "pending" status', async () => {
      try {
        await MatchPlayers.remove(userC.id, requestParams.userC);
        assert.fail();
      } catch (e) {
        assert.equal(e.code, 409);
      }
    });
  });

  describe('Launched', () => {
    it('owner switches his match to "launched" status', async () => {
      await MatchStatus.update(null, { value: 'launched' }, requestParams.userA);
      match = await Match.get(match.id);
      assert.equal(match.status, 'launched');
    });
  });

  describe('Aborted', () => {
    it('owner abort the match', async () => {
      await MatchStatus.update(null, { value: 'aborted' }, requestParams.userA);
      match = await Match.get(match.id);
      assert.equal(match.status, 'aborted');
    });
  });
});
