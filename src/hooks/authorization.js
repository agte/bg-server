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

    context.data.owner = context.params.user.id;
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

      if (context.method === 'find') {
        const aclFilterField = context.method === 'find' ? `${aclField}.read` : `${aclField}.write`;

        if (!context.params.query) {
          context.params.query = {};
        }

        context.params.query.$or = [
          { [ownerField]: user.id },
          { [aclFilterField]: { $in: [...user.roles, user.id] } },
        ];
      } else {
        let allowed = false;
        const resource = await context.service.get(context.id);
        if (resource[ownerField] && resource[ownerField] === user.id) {
          allowed = true;
        } else if (resource[aclField]) {
          const acl = context.method === 'get' ? resource[aclField].read : resource[aclField].write;
          if (acl && acl.length && (acl.includes(user.id) || user.roles.some((role) => acl.includes(role)))) {
            allowed = true;
          }
        }
        if (!allowed) {
          throw new Forbidden();
        }
        if (context.method === 'get') {
          context.result = resource;
        }
      }
    }

    return context;
  },
};
