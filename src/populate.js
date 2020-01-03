module.exports = async (app) => {
  if (app.get('createAdmin')) {
    const users = app.service('users');
    const userRoles = app.service('users/:userId/roles');
    const { data: [existingAdmin] } = await users.find({ query: { roles: 'admin' }, limit: 1 });
    if (!existingAdmin) {
      const admin = await users.create(app.get('adminInfo'));
      await userRoles.create({ id: 'admin' }, { route: { userId: admin.id } });
    }
  }
};
