const assert = require('assert');
const app = require('../../src/app.js');
const reset = require('../reset.js');

describe('Users', () => {
  const usersService = app.service('users');

  let userA;
  let userB;

  before(() => reset(app));

  describe('Guest user', () => {
    it('can sign up', async () => {
      const userAInfo = {
        name: 'AAA',
        email: 'userA@example.com',
        password: '123456',
      };

      const userBInfo = {
        name: 'BBB',
        email: 'userB@example.com',
        password: '7890abc',
      };

      const createdUser = await usersService.create(userAInfo, { provider: 'rest' });
      assert.ok(createdUser.id);
      assert.equal(createdUser.email, userAInfo.email.toLowerCase());
      userA = createdUser;

      userB = await usersService.create(userBInfo, { provider: 'rest' });
    });
  });

  describe('Common user', () => {
    it('can see only himself when listing users', async () => {
      const { total, data: users } = await usersService.find({ provider: 'rest', user: userB });
      assert.equal(total, 1);
      assert.equal(users[0].id, userB.id);
    });
  });

  describe('Admin user', () => {
    const adminRequestOptions = {
      provider: 'rest',
      user: { id: '0', roles: ['user', 'admin'] },
    };

    it('can change anyone\'s password', async () => {
      await usersService.patch(userA.id, { password: 'ABCDEF' }, adminRequestOptions);
      assert.ok(true);
    });

    it('cannot delete another user', async () => {
      try {
        await usersService.remove(userA.id, adminRequestOptions);
        assert.fail('Never get here');
      } catch (e) {
        assert.equal(e.code, 405); // MethodNotAllow
      }
    });

    it('can see all users', async () => {
      const { total } = await usersService.find(adminRequestOptions);
      assert.equal(total, 2);
    });

    it('cannot change anyone\'s roles directly', async () => {
      try {
        await usersService.patch(userA.id, { roles: ['manager'] }, adminRequestOptions);
        assert.fail('Never get here');
      } catch (e) {
        assert.equal(e.code, 400); // BadRequest
      }
    });
  });
});
