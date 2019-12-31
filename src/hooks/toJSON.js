/* eslint-disable no-param-reassign */
module.exports = (context) => {
  if (context.type !== 'after') {
    throw new Error('toJSON hook must be used as an after hook');
  }

  if (context.method === 'find') {
    if (context.result.data.length && context.result.data[0].toJSON) {
      context.result.data = context.result.data.map((doc) => doc.toJSON());
    }
  } else if (context.result) {
    if (context.result.toJSON) {
      context.result = context.result.toJSON();
    }
  }

  return context;
};
