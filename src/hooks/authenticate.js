const { authenticate } = require('@feathersjs/authentication').hooks;

/* eslint-disable no-param-reassign */
module.exports = () => (context) => {
  if (context.type !== 'before') {
    throw new Error('authenticate hook must be used as a before hook');
  }

  const { params } = context;
  if (params.provider && !params.authentication && params.headers && !params.headers.authorization) {
    context.params = {
      ...context.params,
      authentication: { strategy: 'anonymous' },
      anonymous: true,
    };
    return context;
  }

  return authenticate('jwt')(context);
};
