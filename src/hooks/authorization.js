const { Forbidden } = require('@feathersjs/errors');

/* eslint-disable no-param-reassign */
module.exports = {
  setOwner: () => (context) => {
    if (context.type !== 'before') {
      throw new Error('setOwner hook must be used as a before hook');
    }

    if (context.method !== 'create') {
      throw new Error('setOwner hook must be used as a create hook');
    }

    if (context.params.user) {
      context.params.data.owner = context.params.user.id;
    }

    return context;
  },

  checkRoles: (...roles) => (context) => {
    const { params: { provider, user } } = context;

    if (provider) {
      if (!user || !user.roles || !user.roles.length || !roles.some((role) => user.roles.includes(role))) {
        throw new Forbidden();
      }
    }

    return context;
  },

  /* eslint-disable no-param-reassign */
  /* eslint-disable-next-line no-unused-vars */
  addAccessFilter: ({ ownerField = 'owner', aclField = 'acl' } = {}) => (context) => {
    const { params: { provider, user } } = context;

    if (provider) {
      if (user && user.roles.includes('admin')) {
        return context;
      }

      const aclFilterField = context.method === 'find' || context.method === 'get'
        ? `${aclField}.read`
        : `${aclField}.write`;

      if (!user) {
        context.params.query[aclFilterField] = '*';
      }

      if (!context.params.query) {
        context.params.query = {};
      }

      if (user.roles && user.roles.length) {
        context.params.query.$or = [
          { [ownerField]: user.id },
          { [aclFilterField]: { $in: ['*', ...user.roles, user.id] } },
        ];
      } else {
        context.params.query.$or = [
          { [ownerField]: user.id },
          { [aclFilterField]: { $in: ['*', user.id] } },
        ];
      }
    }

    return context;
  },
};
