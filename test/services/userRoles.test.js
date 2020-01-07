const assert = require('assert');
const app = require('../../src/app');
const reset = require('../reset.js');

describe('User roles', () => {
  const usersService = app.service('users');
  const rolesService = app.service('users/:userId/roles');

  let userA;

  before(async () => reset(app));

  describe('Default roles', () => {
    it('every user should get role "user"', async () => {
      userA = await usersService.create({ email: 'userA@example.com', password: '123456' });
      assert.equal(userA.roles.toString(), 'user');
    });
  });

  describe('Adding', () => {
    it('should add the specified role internally', async () => {
      await rolesService.create({ id: 'admin' }, { route: { userId: userA.id } });
      const updatedUser = await usersService.get(userA.id);
      assert.equal(updatedUser.roles.toString(), 'user,admin');
      userA = updatedUser;
    });
  });

  describe('Removing', () => {
    it('should remove the specified role internally', async () => {
      await rolesService.remove('admin', { route: { userId: userA.id } });
      const updatedUser = await usersService.get(userA.id);
      userA = updatedUser;
    });
  });
});
