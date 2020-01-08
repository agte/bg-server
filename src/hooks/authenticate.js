const { authenticate } = require('@feathersjs/authentication').hooks;

/* eslint-disable no-param-reassign */
module.exports = () => (context) => {
  if (context.type !== 'before') {
    throw new Error('authenticate hook must be used as a before hook');
  }

  const { params } = context;
  if (params.user) {
    return context;
  }

  if (!params.provider) {
    context.params.user = {
      id: '000000000000000000000001',
      roles: ['system'],
    };
    return context;
  }

  if (params.provider && !params.authentication && (!params.headers || !params.headers.authorization)) {
    context.params.user = {
      id: '000000000000000000000002',
      roles: ['guest'],
    };
    return context;
  }

  return authenticate('jwt')(context);
};
