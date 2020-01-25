const assert = require('assert');
const reset = require('../reset.js');
const app = require('../../src/app.js');

const User = app.service('user');
const Game = app.service('game');
const Match = app.service('match');
const MatchPlayers = app.service('match/:pid/players');
const MatchStatus = app.service('match/:pid/status');

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
    describe('Common user', () => {
      it('cannot create a match of nonexostong game', async () => {
        try {
          await Match.create({ game: FAKE_ID }, { provider: 'test', user: userA });
          assert.fail();
        } catch (e) {
          assert.equal(e.code, 400);
        }
      });

      it('creates a draft match', async () => {
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

    describe('Owner', () => {
      it('joins his draft match', async () => {
        await MatchPlayers.create({}, requestParams.userA);
        match = await Match.get(match.id);
        assert.equal(match.players[0].id, userA.id);
        assert.equal(match.players[0].name, userA.name);
      });

      it('leaves his draft match', async () => {
        await MatchPlayers.remove(userA.id, requestParams.userA);
        match = await Match.get(match.id);
        assert.equal(match.players.length, 0);
      });
    });
  });

  describe('Gathering', () => {
    describe('Owner', () => {
      it('starts gathering players', async () => {
        await MatchStatus.update(null, { value: 'gathering' }, requestParams.userA);
        match = await Match.get(match.id);
        assert.equal(match.status, 'gathering');
      });

      it('joins his match', async () => {
        await MatchPlayers.create({}, requestParams.userA);
        match = await Match.get(match.id);
        assert.equal(match.players.length, 1);
      });

      it('cannot join his match twice', async () => {
        try {
          await MatchPlayers.create({}, requestParams.userA);
          assert.fail();
        } catch (e) {
          assert.equal(e.code, 409);
        }
      });
    });

    describe('Another user', () => {
      it('joins a match', async () => {
        await MatchPlayers.create({}, requestParams.userB);
        match = await Match.get(match.id);
        assert.equal(match.players[1].id, userB.id);
        assert.equal(match.players[1].name, userB.name);
      });

      it('can not join a match as extra player', async () => {
        try {
          await MatchPlayers.create({}, requestParams.userC);
          assert.fail();
        } catch (e) {
          assert.equal(e.code, 409);
        }
      });

      it('leaves a match', async () => {
        await MatchPlayers.remove(userB.id, requestParams.userB);
        match = await Match.get(match.id);
        assert.equal(match.players.length, 1);
      });
    });
  });

  describe('Launched', () => {
    describe('Owner', () => {
      it('cannot launch his match until there\'s enought players', async () => {
        try {
          await MatchStatus.update(null, { value: 'launched' }, requestParams.userA);
          assert.fail();
        } catch (e) {
          assert.equal(e.code, 409);
        }
      });

      it('launches his match after there\'s enough players', async () => {
        await MatchPlayers.create({}, requestParams.userC);
        await MatchStatus.update(null, { value: 'launched' }, requestParams.userA);
        match = await Match.get(match.id);
        assert.equal(match.status, 'launched');
      });
    });

    describe('Another user', () => {
      it('can\'t leave a launched match', async () => {
        try {
          await MatchPlayers.remove(userC.id, requestParams.userC);
          assert.fail();
        } catch (e) {
          assert.equal(e.code, 409);
        }
      });
    });
  });

  describe('Finished', () => {
    describe('Owner', () => {
      it('owner finishes his match', async () => {
        await MatchStatus.update(null, { value: 'finished' }, requestParams.userA);
        match = await Match.get(match.id);
        assert.equal(match.status, 'finished');
      });
    });
  });

  describe('Aborted', () => {
    it('owner aborts his another match', async () => {
      const match2 = await Match.create({ game: game.id }, { provider: 'test', user: userA });
      const requestParams2 = {
        userA: { route: { pid: match2.id }, provider: 'test', user: userA },
        userB: { route: { pid: match2.id }, provider: 'test', user: userB },
        userC: { route: { pid: match2.id }, provider: 'test', user: userC },
      };
      await MatchStatus.update(null, { value: 'gathering' }, requestParams2.userA);
      await MatchPlayers.create({}, requestParams2.userA);
      await MatchPlayers.create({}, requestParams2.userB);
      await MatchStatus.update(null, { value: 'launched' }, requestParams2.userA);
      await MatchStatus.update(null, { value: 'aborted' }, requestParams2.userA);
    });
  });
});
