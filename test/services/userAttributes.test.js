const assert = require('assert');
const app = require('../../src/app');

describe('User attributes', () => {
  it('registered the service', () => {
    const service = app.service('users/:userId');
    assert.ok(service, 'Registered the service');
  });
});
