const { Forbidden } = require('@feathersjs/errors');

const authenticate = require('../authenticate.js');

/* eslint-disable no-param-reassign */
module.exports = (accessType = '') => async (context) => {
  if (context.type !== 'before') {
    throw new Error('"checkAccess" hook must be used as a before hook');
  }

  let { service, id } = context;

  if (context.service.options.parent) {
    service = context.app.service(context.service.options.parent);
    if (!service) {
      throw new Error('Unknown parent service');
    }
    id = context.params.route.pid;
  }

  if (!id) {
    throw new Error('"checkAccess" hook must be used only in methods which works with id');
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

  const resource = await service.get(id);

  if (resource.owner && resource.owner === context.params.user.id) {
    return context;
  }

  if (resource.acl) {
    if (!accessType) {
      accessType = context.method === 'get' ? 'read' : 'write';
    }
    const acl = resource.acl[accessType];
    const { user } = context.params;
    if (acl && acl.length && (acl.includes(user.id) || user.roles.some((role) => acl.includes(role)))) {
      return context;
    }
  }

  throw new Forbidden();
};
