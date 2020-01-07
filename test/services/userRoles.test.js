const assert = require('assert');
const app = require('../../src/app');
const reset = require('../reset.js');

describe('userRoles', () => {
  let userA;

  before(async () => {
    await reset(app);

    userA = await app.service('users').create({
      email: 'userA@example.com',
      password: '123456',
    }, { provider: 'rest' });
  });

  it('gives to every registered user a "user" role', () => {
    assert.equal(userA.roles.toString(), 'user');
  });

  it('makes an admin from a common user', async () => {
    await app.service('users/:userId/roles').create({ id: 'admin' }, { route: { userId: userA.id } });
    const updatedUser = await app.service('users').get(userA.id);
    assert.equal(updatedUser.roles.toString(), 'user,admin');
    userA = updatedUser;
  });

  it('dissalowa an admin to change his roles directly', async () => {
    try {
      await app.service('users').patch(userA.id, { roles: ['manager'] }, { provider: 'rest', user: userA });
      assert.fail('Never get here');
    } catch (e) {
      assert.equal(e.code, 400); // BadRequest
    }
  });
});
