const { Service } = require('feathers-mongoose');
const { disallow } = require('feathers-hooks-common');

const addAccessFilter = require('../../hooks/authorization/addAccessFilter.js');
const checkAccess = require('../../hooks/authorization/checkAccess.js');
const checkRoles = require('../../hooks/authorization/checkRoles.js');
const setAccessControl = require('../../hooks/authorization/setAccessControl.js');
const setOwner = require('../../hooks/authorization/setOwner.js');
const validate = require('../../hooks/validate.js');

const GameSchema = require('./Game.schema.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

class Games extends Service {
}

const hooks = {
  before: {
    find: [
      addAccessFilter(),
    ],
    get: [
      checkAccess(),
    ],
    create: [
      checkRoles('designer'),
      validate(createSchema),
      setOwner(),
      setAccessControl('read', 'user'),
    ],
    update: [
      disallow(),
    ],
    patch: [
      checkAccess(),
      validate(patchSchema),
    ],
    remove: [
      checkAccess(),
    ],
  },
};

module.exports = function (app) {
  const options = {
    Model: app.get('mongooseClient').model('Game', GameSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/game', new Games(options, app));
  app.service('game').hooks(hooks);
};
