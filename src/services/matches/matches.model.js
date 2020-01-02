// matches-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const matches = new Schema({
    players: { type: [], required: true, defaultsTo: [] },
  }, {
    timestamps: true,
    toJSON: {
      getters: true,
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        const { _id, ...result } = ret;
        return result;
      },
    },
  });

  // This is necessary to avoid model compilation errors in watch mode
  // see https://github.com/Automattic/mongoose/issues/1251
  try {
    return mongooseClient.model('matches');
  } catch (e) {
    return mongooseClient.model('matches', matches);
  }
};
