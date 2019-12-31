const assert = require('assert');
const app = require('../src/app');
const reset = require('./reset.js');

describe('Authentication', () => {
  before(() => reset(app));

  describe('local strategy', () => {
    const userInfo = {
      email: 'someone@example.com',
      password: 'supersecret',
    };

    before(async () => {
      await app.service('users').create(userInfo);
    });

    it('authenticates user and creates accessToken', async () => {
      const { user, accessToken } = await app.service('authentication')
        .create(
          { strategy: 'local', ...userInfo },
          { provider: 'test' },
        );
      assert.ok(accessToken);
      assert.ok(user.id);
      assert.equal(user.email, userInfo.email);
      assert.ok(!user.password);
    });
  });
});
