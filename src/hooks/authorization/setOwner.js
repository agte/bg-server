/* eslint-disable no-param-reassign */
module.exports = () => (context) => {
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
};
