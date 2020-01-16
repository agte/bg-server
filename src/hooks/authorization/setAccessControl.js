/* eslint-disable no-param-reassign */
module.exports = (type, ...roles) => async (context) => {
  if (context.type !== 'before') {
    throw new Error('"setAccessControl" hook must be used as a before hook');
  }

  if (context.method !== 'create') {
    throw new Error('"setAccessControl" hook must be used as a create hook');
  }

  const acl = context.data.acl || {};
  const access = acl[type] || [];
  context.data.acl = {
    ...acl,
    [type]: [...new Set(access.concat(roles))],
  };
  return context;
};
