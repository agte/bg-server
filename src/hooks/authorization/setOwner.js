const authenticate = require('../authenticate.js');

/* eslint-disable no-param-reassign */
module.exports = () => async (context) => {
  if (context.type !== 'before') {
    throw new Error('"setOwner" hook must be used as a before hook');
  }

  if (context.method !== 'create') {
    throw new Error('"setOwner" hook must be used as a create hook');
  }

  if (!context.params.user) {
    context = await authenticate()(context);
  }

  context.data.owner = context.params.user.id;
  return context;
};
