const { mongo: { ObjectId } } = require('mongoose');

const authenticate = require('../authenticate.js');

/* eslint-disable no-param-reassign */
module.exports = () => async (context) => {
  if (context.type !== 'before') {
    throw new Error('"addAccessFilter" hook must be used as a before hook');
  }

  if (context.method !== 'find') {
    throw new Error('"addAccessFilter" hook must be used in a find method');
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

  const { params: { user } } = context;
  if (!context.params.query) {
    context.params.query = {};
  }
  context.params.query.$or = [
    { owner: ObjectId(user.id) },
    { 'acl.read': { $in: [...user.roles, user.id] } },
  ];
  return context;
};
