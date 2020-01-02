// users-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const users = new Schema({
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: { type: String },
    googleId: { type: String },
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

  return mongooseClient.model('users', users);
};
