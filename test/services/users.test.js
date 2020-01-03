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

  it('lists users based', async () => {
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

  it('make an admin from a common user', async () => {
    await app.service('users/:userId/roles').create({ id: 'admin' }, { route: { userId: userA.id } });
    const updatedUser = await app.service('users').get(userA.id);
    assert.equal(updatedUser.roles.toString(), 'admin');
    userA = updatedUser;
  });

  it('allows any admin to see all users', async () => {
    const { total, data: readableUsers } = await app.service('users').find({ provider: 'rest', user: userA });
    assert.equal(total, 2);
    assert.equal(readableUsers.length, 2);
  });

  it('dissalow any admin to change his roles directly', async () => {
    try {
      await app.service('users').patch(userA.id, { roles: ['manager'] }, { provider: 'rest', user: userA });
      assert.fail('Never get here');
    } catch (e) {
      assert.equal(e.code, 400); // BadRequest
    }
  });
});
