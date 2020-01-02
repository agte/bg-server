// games-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const games = new Schema({
    name: {
      type: String,
      unique: true,
      required: true,
    },
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
    return mongooseClient.model('games');
  } catch (e) {
    return mongooseClient.model('games', games);
  }
};
