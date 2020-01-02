module.exports = function createModel(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  return mongooseClient.model('users', new Schema({
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
    },
    googleId: {
      type: String,
    },
    owner: {
      type: Schema.Types.ObjectId,
    },
  }, {
    timestamps: true,
    toJSON: {
      getters: true,
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        const { _id, ...rest } = ret;
        return rest;
      },
    },
  }));
};
