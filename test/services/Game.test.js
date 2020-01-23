const assert = require('assert');
const reset = require('../reset.js');
const app = require('../../src/app.js');

describe('Games', () => {
  const Game = app.service('game');

  before(() => reset(app));

  const user = {
    id: '000000000000000000000000',
    roles: ['user'],
  };

  const designerA = {
    id: '000000000000000000000001',
    roles: ['user', 'designer'],
  };
  const designerB = {
    id: '000000000000000000000002',
    roles: ['user', 'designer'],
  };

  let gameA;
  let gameB;

  describe('Designer', () => {
    it('creates a new game', async () => {
      const game = await Game.create(
        {
          name: 'Tic-Tac-Toe',
          engine: 'tic-tac-toe',
          minPlayers: 2,
          maxPlayers: 2,
        },
        { provider: 'test', user: designerA },
      );
      assert.ok(game.id);
      assert.equal(game.name, 'Tic-Tac-Toe');
      assert.equal(game.owner, designerA.id);
      gameA = game;
    });

    it('patches his own game', async () => {
      const updatedGame = await Game.patch(
        gameA.id,
        { name: 'Krestiki-Noliki' },
        { provider: 'test', user: designerA },
      );
      assert.equal(updatedGame.name, 'Krestiki-Noliki');
      gameA = updatedGame;
    });

    it('cannot patch a game he does not own', async () => {
      gameB = await Game.create(
        { name: 'Chess', engine: 'chess' },
        { provider: 'test', user: designerB },
      );
      try {
        await Game.patch(
          gameB.id,
          { name: 'Checkers' },
          { provider: 'test', user: designerA },
        );
        assert.fail('Never get here');
      } catch (e) {
        assert.equal(e.code, 403); // Forbidden
      }
    });
  });

  describe('User', () => {
    it('sees all games', async () => {
      const { data } = await Game.find({ provider: 'test', user });
      assert.equal(data.length, 2);
    });
  });

  describe('Guest', () => {
    it('sees all games', async () => {
      const { data } = await Game.find({ provider: 'test' });
      assert.equal(data.length, 2);
    });
  });
});
