const assert = require('assert');
const app = require('../../src/app.js');
const reset = require('../reset.js');

describe('Users', () => {
  before(() => reset(app));

  let userA;
  let userB;

  const userAInfo = {
    email: 'userA@example.com',
    password: '123456',
  };

  const userBInfo = {
    email: 'userB@example.com',
    password: '7890abc',
  };

  it('creates new users', async () => {
    const createdUser = await app.service('users').create(userAInfo, { provider: 'rest' });
    assert.ok(createdUser.id);
    assert.equal(createdUser.email, userAInfo.email.toLowerCase());
    userA = createdUser;

    try {
      userB = await app.service('users').create(userBInfo, { provider: 'rest' });
    } catch (e) {
      assert.fail('Never get here');
    }
  });

  it('allows a common user to see only himself', async () => {
    const { total, data: readableUsers } = await app.service('users').find({ provider: 'rest', user: userB });
    assert.equal(total, 1);
    assert.equal(readableUsers.length, 1);
    assert.equal(readableUsers[0].id, userB.id);
  });

  it('dissalow a user to delete himself or anyone', async () => {
    try {
      await app.service('users').remove(userA.id, { provider: 'rest', user: userA });
      assert.fail('Never get here');
    } catch (e) {
      assert.equal(e.code, 405); // MethodNotAllow
    }
  });

  it('allows an admin to see all users', async () => {
    const { total, data: readableUsers } = await app.service('users').find({
      provider: 'rest',
      user: { ...userA, roles: ['admin'] },
    });
    assert.equal(total, 2);
    assert.equal(readableUsers.length, 2);
  });
});
