const { Forbidden } = require('@feathersjs/errors');
const authenticate = require('./authenticate.js');

/* eslint-disable no-param-reassign */
module.exports = {
  setOwner: () => async (context) => {
    if (context.type !== 'before') {
      throw new Error('setOwner hook must be used as a before hook');
    }

    if (context.method !== 'create') {
      throw new Error('setOwner hook must be used as a create hook');
    }

    if (!context.params.provider) {
      return context;
    }

    if (!context.params.user) {
      context = await authenticate()(context);
    }

    context.params.data.owner = context.params.user.id;
    return context;
  },

  checkRoles: (...roles) => async (context) => {
    if (context.type !== 'before') {
      throw new Error('setOwner hook must be used as a before hook');
    }

    if (!context.params.provider) {
      return context;
    }

    if (!context.params.user) {
      context = await authenticate()(context);
    }

    const { params: { provider, user } } = context;

    if (provider) {
      if (user.roles.includes('admin')) {
        return context;
      }

      if (!roles.some((role) => user.roles.includes(role))) {
        throw new Forbidden();
      }
    }

    return context;
  },

  addAccessFilter: ({ ownerField = 'owner', aclField = 'acl' } = {}) => async (context) => {
    if (context.type !== 'before') {
      throw new Error('addAccessFilter hook must be used as a before hook');
    }

    if (!context.params.provider) {
      return context;
    }

    if (!context.params.user) {
      context = await authenticate()(context);
    }

    const { params: { provider, user } } = context;

    if (provider) {
      if (user.roles.includes('admin')) {
        return context;
      }

      const aclFilterField = context.method === 'find' || context.method === 'get'
        ? `${aclField}.read`
        : `${aclField}.write`;

      if (!context.params.query) {
        context.params.query = {};
      }

      context.params.query.$or = [
        { [ownerField]: user.id },
        { [aclFilterField]: { $in: ['*', ...user.roles, user.id] } },
      ];
    }

    return context;
  },
};
