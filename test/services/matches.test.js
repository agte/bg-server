const assert = require('assert');
const reset = require('../reset.js');
const app = require('../../src/app.js');

describe('Matches', () => {
  const matchesService = app.service('matches');
  const gamesService = app.service('games');

  const userA = {
    id: '000000000000000000000010',
    roles: ['user'],
  };

  let game;
  // let matchA;

  before(async () => {
    await reset(app);
    game = await gamesService.create({ name: 'Tic-Tac-Toe' });
  });

  describe('Draft', () => {
    it('should create a match', async () => {
      const match = await matchesService.create({ game: game.id }, { provider: 'rest', user: userA });
      assert.equal(match.game, game.id);
      assert.equal(match.status, 'draft');
      assert.equal(match.owner, userA.id);
      // matchA = match;
    });

    it('should check if specified game exists', async () => {
      try {
        await matchesService.create(
          { game: '000000000000000000000000' },
          { provider: 'rest', user: userA },
        );
        assert.fail('Never get here');
      } catch (e) {
        assert.equal(e.code, 400);
      }
    });
  });
});
