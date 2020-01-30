const assert = require('assert');
const reset = require('../reset.js');
const app = require('../../src/app.js');

describe('GameKind', () => {
  const GameKind = app.service('gameKind');

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

  let gameKindA;
  let gameKindB;

  describe('Designer', () => {
    it('creates a new game gameKind', async () => {
      const gameKind = await GameKind.create(
        {
          id: 'tic-tac-toe',
          name: 'Tic-Tac-Toe',
          minPlayers: 2,
          maxPlayers: 2,
        },
        { provider: 'test', user: designerA },
      );
      assert.ok(gameKind.id);
      assert.equal(gameKind.name, 'Tic-Tac-Toe');
      assert.equal(gameKind.owner, designerA.id);
      gameKindA = gameKind;
    });

    it('patches his own game gameKind', async () => {
      const updatedGameKind = await GameKind.patch(
        gameKindA.id,
        { name: 'Krestiki-Noliki' },
        { provider: 'test', user: designerA },
      );
      assert.equal(updatedGameKind.name, 'Krestiki-Noliki');
      gameKindA = updatedGameKind;
    });

    it('cannot patch a game gameKind he does not own', async () => {
      gameKindB = await GameKind.create(
        { id: 'chess', name: 'Chess' },
        { provider: 'test', user: designerB },
      );
      try {
        await GameKind.patch(
          gameKindB.id,
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
    it('sees all gameKinds', async () => {
      const { data } = await GameKind.find({ provider: 'test', user });
      assert.equal(data.length, 2);
    });
  });

  describe('Guest', () => {
    it('sees all gameKinds', async () => {
      const { data } = await GameKind.find({ provider: 'test' });
      assert.equal(data.length, 2);
    });
  });
});
