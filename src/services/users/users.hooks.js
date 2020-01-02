const Ajv = require('ajv');
const { validateSchema, disallow } = require('feathers-hooks-common');
const { authenticate } = require('@feathersjs/authentication').hooks;
const { hashPassword, protect } = require('@feathersjs/authentication-local').hooks;
const checkRoles = require('../../hooks/authorization/checkRoles.js');
const setOwner = require('../../hooks/authorization/setOwner.js');
const addAccessFilter = require('../../hooks/authorization/addAccessFilter.js');
const toJSON = require('../../hooks/toJSON.js');
const createSchema = require('./schemas/create.json');

module.exports = {
  before: {
    all: [],
    find: [
      authenticate('jwt'),
      addAccessFilter({ ownerField: '_id' }),
    ],
    get: [
      authenticate('jwt'),
      addAccessFilter({ ownerField: '_id' }),
    ],
    create: [
      validateSchema(createSchema, Ajv),
      hashPassword('password'),
    ],
    update: [
      disallow(),
    ],
    patch: [
      authenticate('jwt'),
      checkRoles('admin'),
      hashPassword('password'),
    ],
    remove: [
      disallow(),
    ],
  },

  after: {
    all: [
      toJSON(),
      // Make sure the password field is never sent to the client
      // Always must be the last hook
      protect('password', 'googleId'),
    ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
