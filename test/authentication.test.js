const assert = require('assert');
const app = require('../src/app.js');
const reset = require('./reset.js');

describe('Authentication', () => {
  before(() => reset(app));

  describe('local strategy', () => {
    const userInfo = {
      name: 'someone',
      email: 'someone@example.com',
      password: 'supersecret',
    };

    before(() => app.service('user').create(userInfo));

    it('authenticates user and creates accessToken', async () => {
      const { accessToken, user } = await app.service('authentication').create({ strategy: 'local', ...userInfo });
      assert.ok(accessToken);
      assert.ok(user.id);
      assert.equal(user.email, userInfo.email);
    });
  });
});
