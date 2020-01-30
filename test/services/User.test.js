const assert = require('assert');
const app = require('../../src/app.js');
const reset = require('../reset.js');

describe('User', () => {
  const User = app.service('user');
  const UserRoles = app.service('user/:pid/roles');

  let userA;
  let userB;

  before(() => reset(app));

  describe('Guest', () => {
    it('signs up', async () => {
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

      userA = await User.create(userAInfo, { provider: 'rest' });
      assert.ok(userA.id);
      assert.equal(userA.email, userAInfo.email.toLowerCase());

      userB = await User.create(userBInfo, { provider: 'rest' });
    });
  });

  describe('Common user', () => {
    it('has one and only role "user" by default', async () => {
      assert.equal(userA.roles.toString(), 'user');
    });

    it('sees only himself in a user list', async () => {
      const { total, data: users } = await User.find({ provider: 'rest', user: userB });
      assert.equal(total, 1);
      assert.equal(users[0].id, userB.id);
    });
  });

  describe('Admin', () => {
    const adminRequestOptions = {
      provider: 'rest',
      user: { id: '000000000000000000000000', roles: ['user', 'admin'] },
    };

    it('changes another user\'s password', async () => {
      await User.patch(userA.id, { password: 'ABCDEF' }, adminRequestOptions);
      assert.ok(true);
    });

    it('cannot delete any user', async () => {
      try {
        await User.remove(userA.id, adminRequestOptions);
        assert.fail();
      } catch (e) {
        assert.equal(e.code, 405); // MethodNotAllow
      }
    });

    it('sees all users', async () => {
      const { total } = await User.find(adminRequestOptions);
      assert.equal(total, 2);
    });

    it('adds a role to a user', async () => {
      await UserRoles.create({ id: 'designer' }, { route: { pid: userB.id }, ...adminRequestOptions });
      userB = await User.get(userB.id);
      assert.equal(userB.roles.toString(), 'user,designer');
    });

    it('removes a role from a user', async () => {
      await UserRoles.remove('designer', { route: { pid: userB.id }, ...adminRequestOptions });
      userB = await User.get(userB.id);
    });
  });
});
