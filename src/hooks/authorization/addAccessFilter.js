const { Forbidden } = require('@feathersjs/errors');

/* eslint-disable no-param-reassign */
/* eslint-disable-next-line no-unused-vars */
module.exports = ({ ownerField = 'owner', aclField = 'acl' } = {}) => (context) => {
  const { params: { provider, user } } = context;
  if (provider) {
    if (!user) {
      throw new Forbidden();
    }

    if (!context.params.query) {
      context.params.query = {};
    }

    const aclFilterField = context.method === 'find' || context.method === 'get'
      ? `${aclField}.read`
      : `${aclField}.write`;

    if (user.roles && user.roles.length) {
      context.params.query.$or = [
        { [ownerField]: user.id },
        { [aclFilterField]: { $in: [...user.roles, user.id] } },
      ];
    } else {
      context.params.query.$or = [
        { [ownerField]: user.id },
        { [aclFilterField]: user.id },
      ];
    }
  }

  return context;
};
