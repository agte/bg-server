const User = require('./User/User.service.js');
const UserRoles = require('./User/UserRoles.service.js');
const GameKind = require('./GameKind/GameKind.service.js');
const Game = require('./Game/Game.service.js');
const GamePlayers = require('./Game/GamePlayers.service.js');
const GameStatus = require('./Game/GameStatus.service.js');

module.exports = function (app) {
  app.configure(User);
  app.configure(UserRoles);
  app.configure(GameKind);
  app.configure(Game);
  app.configure(GamePlayers);
  app.configure(GameStatus);
};
