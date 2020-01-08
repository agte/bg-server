/* eslint-disable no-param-reassign */
module.exports = () => async (context) => {
  if (context.type !== 'before') {
    throw new Error('getResource hook must be used as a before hook');
  }

  if (!context.id) {
    return context;
  }

  if (context.params.resource) {
    return context;
  }

  context.params.resource = await context.service.get(context.id);
  return context;
};
