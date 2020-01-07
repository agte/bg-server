const assert = require('assert');
const reset = require('../reset.js');
const app = require('../../src/app.js');

describe('Games', () => {
  const gamesService = app.service('games');

  before(() => reset(app));

  const designerA = {
    id: '000000000000000000000000',
    roles: ['user', 'designer'],
  };
  const designerB = {
    id: '000000000000000000000001',
    roles: ['user', 'designer'],
  };

  let gameA;
  let gameB;

  describe('Designer', () => {
    it('can create a new game', async () => {
      const game = await gamesService.create(
        { name: 'Tic-Tac-Toe', minPlayers: 2, maxPlayers: 2 },
        { provider: 'rest', user: designerA },
      );
      assert.ok(game.id);
      assert.equal(game.name, 'Tic-Tac-Toe');
      assert.equal(game.owner, designerA.id);
      gameA = game;
    });

    it('can patch his own game', async () => {
      const updatedGame = await gamesService.patch(
        gameA.id,
        { name: 'Krestiki-Noliki' },
        { provider: 'rest', user: designerA },
      );
      assert.equal(updatedGame.name, 'Krestiki-Noliki');
      gameA = updatedGame;
    });

    it('cannot patch a game he does not own', async () => {
      gameB = await gamesService.create(
        { name: 'Chess' },
        { provider: 'rest', user: designerB },
      );
      try {
        await gamesService.patch(
          gameB.id,
          { name: 'Checkers' },
          { provider: 'rest', user: designerA },
        );
        assert.fail('Never get here');
      } catch (e) {
        assert.equal(e.code, 403); // Forbidden
      }
    });
  });
});
