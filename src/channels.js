module.exports = function (app) {
  if (typeof app.channel !== 'function') {
    // If no real-time functionality has been configured just return
    return;
  }

  app.on('connection', (connection) => {
    app.channel('guest').join(connection);
  });

  app.on('login', (authResult, { connection }) => {
    if (connection && connection.user) {
      connection.user.roles.forEach((role) => app.channel(role).join(connection));
      app.channel(connection.user.id).join(connection);
    }
  });

  app.on('logout', (authResult, { connection }) => {
    if (connection && connection.user) {
      connection.user.roles.forEach((role) => app.channel(role).leave(connection));
      app.channel(connection.user.id).leave(connection);
    }
  });

  /* eslint-disable no-param-reassign */
  app.publish((data) => {
    let names = [];
    if (data.acl && data.acl.read) {
      names = data.acl.read;
      delete data.acl;
    }
    if (data.owner) {
      names.push(data.owner);
    }

    if (!names.length) {
      return null;
    }
    return app.channel(...names);
  });
  /* eslint-enable no-param-reassign */
};
