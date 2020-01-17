const { Schema } = require('mongoose');

const UserSchema = new Schema({
  roles: {
    type: [String],
    default: ['user'],
  },
  name: {
    type: String,
    minlength: 2,
    maxlength: 25,
    required: true,
    unique: true,
  },
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
      ret.owner = ret.owner.toString();
      return ret;
    },
    /* eslint-enable no-param-reassign */
  },
});

module.exports = UserSchema;
