const assert = require('assert');
const app = require('../../src/app');

describe('\'userRoles\' service', () => {
  it('registered the service', () => {
    const service = app.service('users/:userId/roles');

    assert.ok(service, 'Registered the service');
  });
});
