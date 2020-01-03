const users = require('./users/users.service.js');
const userRoles = require('./users/user-roles.service.js');
const userAttributes = require('./users/user-attributes.service.js');
const games = require('./games/games.service.js');
const matches = require('./matches/matches.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(users);
  app.configure(userRoles);
  app.configure(userAttributes);
  app.configure(games);
  app.configure(matches);
};
