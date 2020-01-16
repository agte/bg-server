const { Forbidden } = require('@feathersjs/errors');

const authenticate = require('../authenticate.js');

/* eslint-disable no-param-reassign */
module.exports = (...roles) => async (context) => {
  if (context.type !== 'before') {
    throw new Error('"checkRoles" hook must be used as a before hook');
  }

  if (!context.params.provider) {
    return context;
  }

  if (!context.params.user) {
    context = await authenticate()(context);
  }

  if (context.params.user.roles.includes('admin')) {
    return context;
  }

  if (roles.some((role) => context.params.user.roles.includes(role))) {
    return context;
  }

  throw new Forbidden();
};
