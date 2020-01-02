const { Forbidden } = require('@feathersjs/errors');

/* eslint-disable-next-line no-unused-vars */
module.exports = (...roles) => (context) => {
  const { params: { provider, user } } = context;

  if (provider) {
    if (!user || !user.roles || !user.roles.length || !roles.some((role) => user.roles.includes(role))) {
      throw new Forbidden();
    }
  }

  return context;
};
