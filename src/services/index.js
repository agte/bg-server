const users = require('./users/users.service.js');
const userRoles = require('./users/userRoles.service.js');
const games = require('./games/games.service.js');
const matches = require('./matches/matches.service.js');
const matchPlayers = require('./matches/matchPlayers.service.js');
const matchStatus = require('./matches/matchStatus.service.js');

module.exports = function (app) {
  app.configure(users);
  app.configure(userRoles);
  app.configure(games);
  app.configure(matches);
  app.configure(matchPlayers);
  app.configure(matchStatus);
};
