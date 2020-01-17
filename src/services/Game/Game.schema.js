const { Schema } = require('mongoose');

const ACLSchema = require('../../mongoose/ACLSchema.js');

const GameSchema = new Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  engine: {
    type: String,
    required: true,
  },
  minPlayers: {
    type: Number,
    min: 1,
    default: 1,
  },
  maxPlayers: {
    type: Number,
    min: 0,
    default: 0,
  },
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  acl: ACLSchema,
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

module.exports = GameSchema;
