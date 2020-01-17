const User = require('./User/User.service.js');
const UserRoles = require('./User/UserRoles.service.js');
const Game = require('./Game/Game.service.js');
const Match = require('./Match/Match.service.js');
const MatchPlayers = require('./Match/MatchPlayers.service.js');
const MatchStatus = require('./Match/MatchStatus.service.js');

module.exports = function (app) {
  app.configure(User);
  app.configure(UserRoles);
  app.configure(Game);
  app.configure(Match);
  app.configure(MatchPlayers);
  app.configure(MatchStatus);
};
