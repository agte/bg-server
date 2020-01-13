const assert = require('assert');
const app = require('../../src/app');
const reset = require('../reset.js');

describe('Match players', () => {
  const usersService = app.service('users');
  const gamesService = app.service('games');
  const matchService = app.service('matches');
  const matchPlayersService = app.service('matches/:pid/players');

  let userA;
  let userB;
  let userC;
  let game;
  let match;

  before(async () => {
    await reset(app);
    userA = await usersService.create({ name: 'AAA', email: 'AAA@mail.com', password: '123123' });
    userB = await usersService.create({ name: 'BBB', email: 'BBB@mail.com', password: '123123' });
    userC = await usersService.create({ name: 'CCC', email: 'CCC@mail.com', password: '123123' });
    game = await gamesService.create({
      name: 'Tic-Tac-Toe',
      engine: 'tic-tac-toe',
      minPlayers: 2,
      maxPlayers: 2,
    });
    match = await matchService.create({ game: game.id }, { provider: 'rest', user: userA });
  });

  describe('Joining', () => {
    it('allows other users to join the game', async () => {
      await matchPlayersService.create({}, { route: { pid: match.id }, provider: 'rest', user: userB });
      const players = await matchPlayersService.find({ route: { pid: match.id } });
      assert.equal(players[0].id, userA.id);
      assert.equal(players[0].name, userA.name);
      assert.equal(players[1].id, userB.id);
      assert.equal(players[1].name, userB.name);
    });

    it('does not allow to any user to join the game twice', async () => {
      try {
        await matchPlayersService.create({}, { route: { pid: match.id }, provider: 'rest', user: userB });
        assert.fail('Never get here');
      } catch (e) {
        assert.equal(e.code, 409);
      }
    });

    it('does not allow to join the game a maxPlayers+1 player', async () => {
      try {
        await matchPlayersService.create({}, { route: { pid: match.id }, provider: 'rest', user: userC });
        assert.fail('Never get here');
      } catch (e) {
        assert.equal(e.code, 409);
      }
    });
  });
});
