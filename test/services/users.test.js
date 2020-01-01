const assert = require('assert');
const app = require('../../src/app.js');
const reset = require('../reset.js');

describe('Users', () => {
  before(() => reset(app));

  const userInfo = {
    email: 'someone@example.com',
    password: 'supersecret',
  };

  it('creates a new user', async () => {
    const createdUser = await app.service('users').create(userInfo);
    assert.ok(createdUser.id);
    assert.equal(createdUser.email, userInfo.email);
  });

  it('lists users', async () => {
    const { total, data: users } = await app.service('users').find();
    assert.equal(total, 1);
    assert.equal(users.length, 1);
  });
});
