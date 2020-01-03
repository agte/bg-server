const assert = require('assert');
const app = require('../../src/app');

describe('userAttributes', () => {
  it('registered the service', () => {
    const service = app.service('users/:userId');
    assert.ok(service, 'Registered the service');
  });
});
