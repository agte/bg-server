const logger = require('./logger');

module.exports = async (app) => {
  logger.info('Start populating the database...');
  const User = app.service('user');
  const UserRoles = app.service('user/:pid/roles');

  let { data: [admin] } = await User.find({ query: { roles: 'admin', $limit: 1 } });
  if (!admin) {
    admin = await User.create(app.get('adminInfo'));
    await UserRoles.create({ id: 'admin' }, { route: { pid: admin.id } });
  }

  const GameKind = app.service('gameKind');

  // Пока захардкодим крестики-нолики.
  // Затем будем задавать массив игр через конфигурационный файл.
  const TicTacToe = await GameKind.Model.findById('tic-tac-toe');
  if (!TicTacToe) {
    await GameKind.create({
      id: 'tic-tac-toe',
      name: 'Крестики-нолики',
      minPlayers: 2,
      maxPlayers: 2,
    });
  }

  logger.info('Populating the database is finished.');
};
