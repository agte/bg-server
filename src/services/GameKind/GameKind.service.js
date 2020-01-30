const { Service } = require('feathers-mongoose');
const { disallow } = require('feathers-hooks-common');

const addAccessFilter = require('../../hooks/authorization/addAccessFilter.js');
const checkAccess = require('../../hooks/authorization/checkAccess.js');
const checkRoles = require('../../hooks/authorization/checkRoles.js');
const setAccessControl = require('../../hooks/authorization/setAccessControl.js');
const setOwner = require('../../hooks/authorization/setOwner.js');
const validate = require('../../hooks/validate.js');

const GameKindSchema = require('./GameKind.schema.js');

const createSchema = require('./schemas/create.json');
const patchSchema = require('./schemas/patch.json');

class GameKind extends Service {
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
      setAccessControl('read', 'user', 'guest'),
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
    Model: app.get('mongooseClient').model('GameKind', GameKindSchema),
    paginate: app.get('paginate'),
    lean: false,
  };
  app.use('/gameKind', new GameKind(options, app));
  app.service('gameKind').hooks(hooks);
};
