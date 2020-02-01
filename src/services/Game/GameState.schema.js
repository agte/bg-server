const { Schema } = require('mongoose');

const GameStateSchema = new Schema({
  data: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
  toJSON: {
    versionKey: false,
    /* eslint-disable no-param-reassign */
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
    /* eslint-enable no-param-reassign */
  },
});

module.exports = GameStateSchema;
