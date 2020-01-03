const users = require('./users/users.service.js');
const userRoles = require('./users/userRoles.service.js');
const userAttributes = require('./users/userAttributes.service.js');
const games = require('./games/games.service.js');
const matches = require('./matches/matches.service.js');

module.exports = function (app) {
  app.configure(users);
  app.configure(userRoles);
  app.configure(userAttributes);
  app.configure(games);
  app.configure(matches);
};
