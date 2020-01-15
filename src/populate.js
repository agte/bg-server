const logger = require('./logger');

module.exports = async (app) => {
  logger.info('Start populating the database...');
  const usersService = app.service('users');
  const userRolesService = app.service('users/:pid/roles');

  let { data: [admin] } = await usersService.find({ query: { roles: 'admin', $limit: 1 } });
  if (!admin) {
    admin = await usersService.create(app.get('adminInfo'));
    await userRolesService.create({ id: 'admin' }, { route: { pid: admin.id } });
  }

  const gamesService = app.service('games');

  // Пока захардкодим крестики-нолики.
  // Затем будем задавать массив игр через конфигурационный файл.
  const { data: [gameTicTacToe] } = await gamesService.find({ query: { name: 'Крестики-нолики' }, limit: 1 });
  if (!gameTicTacToe) {
    await gamesService.create({
      name: 'Крестики-нолики',
      engine: 'tic-tac-toe',
      minPlayers: 2,
      maxPlayers: 2,
    });
  }

  logger.info('Populating the database is finished.');
};
