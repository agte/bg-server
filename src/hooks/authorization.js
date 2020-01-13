const { Schema, mongo: { ObjectId } } = require('mongoose');
const { Forbidden } = require('@feathersjs/errors');
const authenticate = require('./authenticate.js');

/* eslint-disable no-param-reassign */
module.exports = {
  setOwner: () => async (context) => {
    if (context.type !== 'before') {
      throw new Error('setOwner hook must be used as a before hook');
    }

    if (context.method !== 'create') {
      throw new Error('setOwner hook must be used as a create hook');
    }

    if (!context.params.user) {
      context = await authenticate()(context);
    }

    context.data.owner = context.params.user.id;
    return context;
  },

  checkRoles: (...roles) => async (context) => {
    if (context.type !== 'before') {
      throw new Error('checkRoles hook must be used as a before hook');
    }

    if (!context.params.provider) {
      return context;
    }

    if (!context.params.user) {
      context = await authenticate()(context);
    }

    const { params: { provider, user } } = context;

    if (provider) {
      if (user.roles.includes('admin')) {
        return context;
      }

      if (!roles.some((role) => user.roles.includes(role))) {
        throw new Forbidden();
      }
    }

    return context;
  },

  addAccessFilter: () => async (context) => {
    if (context.type !== 'before') {
      throw new Error('addAccessFilter hook must be used as a before hook');
    }

    if (context.method !== 'find') {
      throw new Error('addAccessFilter hook must be used in a find method');
    }

    if (!context.params.provider) {
      return context;
    }

    if (!context.params.user) {
      context = await authenticate()(context);
    }

    const { params: { user } } = context;

    if (user.roles.includes('admin')) {
      return context;
    }

    if (!context.params.query) {
      context.params.query = {};
    }

    context.params.query.$or = [
      { owner: ObjectId(user.id) },
      { 'acl.read': { $in: [...user.roles, user.id] } },
    ];
    return context;
  },

  checkAccess: (accessType = '') => async (context) => {
    if (context.type !== 'before') {
      throw new Error('checkAccess hook must be used as a before hook');
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
      throw new Error('checkAccess hook must be used only in methods which works with id');
    }

    let { params: { user } } = context;

    if (!context.params.provider) {
      return context;
    }

    if (!user) {
      context = await authenticate()(context);
      user = context.params.user;
    }

    if (user.roles.includes('admin')) {
      return context;
    }

    const resource = await service.get(id);

    if (resource.owner && resource.owner === user.id) {
      return context;
    }

    if (resource.acl) {
      if (!accessType) {
        accessType = context.method === 'get' ? 'read' : 'write';
      }
      const acl = resource.acl[accessType];
      if (acl && acl.length && (acl.includes(user.id) || user.roles.some((role) => acl.includes(role)))) {
        return context;
      }
    }

    throw new Forbidden();
  },

  setAccessControl: (type, ...roles) => async (context) => {
    if (context.type !== 'before') {
      throw new Error('setAccessControl hook must be used as a before hook');
    }

    if (context.method !== 'create') {
      throw new Error('setAccessControl hook must be used as a create hook');
    }

    const acl = context.data.acl || {};
    const access = acl[type] || [];
    context.data.acl = {
      ...acl,
      [type]: [...new Set(access.concat(roles))],
    };
    return context;
  },

  ACLSchema: new Schema({
    read: {
      type: [String],
    },
    write: {
      type: [String],
    },
  }, {
    _id: false,
    id: false,
    timestamps: false,
  }),
};
