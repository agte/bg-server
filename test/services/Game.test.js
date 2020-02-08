const assert = require('assert');
const reset = require('../reset.js');
const app = require('../../src/app.js');

const User = app.service('user');
const GameKind = app.service('gameKind');
const Game = app.service('game');
const GamePlayers = app.service('game/:pid/players');
const GameStatus = app.service('game/:pid/status');
const GameState = app.service('game/:pid/state');

const FAKE_ID = '000000000000000000000000';

let userA;
let userB;
let userC;
let gameKind;
let game;
let requestParams;

describe('Game', () => {
  before(async () => {
    await reset(app);
    userA = await User.create({ name: 'AAA', email: 'AAA@mail.com', password: '123123' });
    userB = await User.create({ name: 'BBB', email: 'BBB@mail.com', password: '123123' });
    userC = await User.create({ name: 'CCC', email: 'CCC@mail.com', password: '123123' });
    gameKind = await GameKind.create({
      id: 'tic-tac-toe',
      name: 'Tic-Tac-Toe',
      minPlayers: 2,
      maxPlayers: 2,
    });
  });

  describe('Draft', () => {
    describe('Common user', () => {
      it('cannot create a game of nonexisting kind', async () => {
        try {
          await Game.create({ gameKind: FAKE_ID }, { provider: 'test', user: userA });
          assert.fail();
        } catch (e) {
          assert.equal(e.code, 400);
        }
      });

      it('creates a draft game', async () => {
        game = await Game.create({ kind: gameKind.id }, { provider: 'test', user: userA });
        assert.equal(game.kind, gameKind.id);
        assert.equal(game.status, 'draft');
        assert.equal(game.owner, userA.id);
        assert.equal(game.minPlayers, gameKind.minPlayers);
        assert.equal(game.maxPlayers, gameKind.maxPlayers);
        requestParams = {
          userA: { route: { pid: game.id }, provider: 'test', user: userA },
          userB: { route: { pid: game.id }, provider: 'test', user: userB },
          userC: { route: { pid: game.id }, provider: 'test', user: userC },
        };
      });
    });

    describe('Owner', () => {
      it('joins his draft game', async () => {
        await GamePlayers.create({}, requestParams.userA);
        game = await Game.get(game.id);
        assert.ok(game.players[0].id);
        assert.equal(game.players[0].user, userA.id);
        assert.equal(game.players[0].name, userA.name);
      });

      it('leaves his draft game', async () => {
        await GamePlayers.remove(game.players[0].id, requestParams.userA);
        game = await Game.get(game.id);
        assert.equal(game.players.length, 0);
      });
    });
  });

  describe('Gathering', () => {
    describe('Owner', () => {
      it('starts gathering players', async () => {
        await GameStatus.update(null, { value: 'gathering' }, requestParams.userA);
        game = await Game.get(game.id);
        assert.equal(game.status, 'gathering');
      });

      it('joins his game', async () => {
        await GamePlayers.create({}, requestParams.userA);
        game = await Game.get(game.id);
        assert.equal(game.players.length, 1);
      });
    });

    describe('Another user', () => {
      it('joins a game', async () => {
        await GamePlayers.create({}, requestParams.userB);
        game = await Game.get(game.id);
        assert.equal(game.players[1].user, userB.id);
        assert.equal(game.players[1].name, userB.name);
      });

      it('can not join a game as extra player', async () => {
        try {
          await GamePlayers.create({}, requestParams.userC);
          assert.fail();
        } catch (e) {
          assert.equal(e.code, 409);
        }
      });

      it('leaves a game', async () => {
        await GamePlayers.remove(game.players[1].id, requestParams.userB);
        game = await Game.get(game.id);
        assert.equal(game.players.length, 1);
      });
    });
  });

  describe('Launched', () => {
    describe('Owner', () => {
      it('cannot launch his game until there\'s enought players', async () => {
        try {
          await GameStatus.update(null, { value: 'launched' }, requestParams.userA);
          assert.fail();
        } catch (e) {
          assert.equal(e.code, 409);
        }
      });

      it('launches his game', async () => {
        await GamePlayers.create({}, requestParams.userC);
        await GameStatus.update(null, { value: 'launched' }, requestParams.userA);

        game = await Game.get(game.id);
        assert.equal(game.status, 'launched');

        const states = await GameState.find(requestParams.userA);
        assert.equal(states.length, 1);
        assert.equal(states[0].state.finished, false);
        assert.ok(states[0].state.players);
        assert.ok(states[0].state.cells);
      });
    });

    describe('Another user', () => {
      it('can\'t leave a launched game', async () => {
        try {
          await GamePlayers.remove(game.players[1].id, requestParams.userC);
          assert.fail();
        } catch (e) {
          assert.equal(e.code, 409);
        }
      });
    });

    describe('First player', () => {
      it('makes a move', async () => {
        const result = await GameState.patch(
          null,
          { player: 'x', action: 'mark', options: { id: '1:1' } },
          requestParams.userA,
        );
        assert.equal(result.id, 'x');
        assert.ok(result.diff);
      });
    });
  });

  describe('Finished', () => {
    it('a game comes to end', async () => {
      await GameState.patch(
        null,
        { player: 'o', action: 'mark', options: { id: '1:2' } },
        requestParams.userC,
      );
      await GameState.patch(
        null,
        { player: 'x', action: 'mark', options: { id: '0:1' } },
        requestParams.userA,
      );
      await GameState.patch(
        null,
        { player: 'o', action: 'mark', options: { id: '2:1' } },
        requestParams.userC,
      );
      await GameState.patch(
        null,
        { player: 'x', action: 'mark', options: { id: '0:2' } },
        requestParams.userA,
      );
      await GameState.patch(
        null,
        { player: 'o', action: 'mark', options: { id: '2:0' } },
        requestParams.userC,
      );
      Game.once('patched', (resource) => {
        if (resource.status === 'finished') {
          assert.ok(true);
        } else {
          assert.fail();
        }
      });
      await GameState.patch(
        null,
        { player: 'x', action: 'mark', options: { id: '0:0' } },
        requestParams.userA,
      );
    });
  });

  describe('Aborted', () => {
    it('owner aborts his another game', async () => {
      const game2 = await Game.create({ kind: gameKind.id }, { provider: 'test', user: userA });
      const requestParams2 = {
        userA: { route: { pid: game2.id }, provider: 'test', user: userA },
        userB: { route: { pid: game2.id }, provider: 'test', user: userB },
        userC: { route: { pid: game2.id }, provider: 'test', user: userC },
      };
      await GameStatus.update(null, { value: 'gathering' }, requestParams2.userA);
      await GamePlayers.create({}, requestParams2.userA);
      await GamePlayers.create({}, requestParams2.userB);
      await GameStatus.update(null, { value: 'launched' }, requestParams2.userA);
      await GameStatus.update(null, { value: 'aborted' }, requestParams2.userA);
    });
  });
});
