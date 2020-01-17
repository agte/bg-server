const { Schema } = require('mongoose');

const ACLSchema = require('../../mongoose/ACLSchema.js');

const PlayerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
}, {
  _id: true,
  id: true,
  timestamps: false,
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

const MatchSchema = new Schema({
  game: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  status: {
    type: String,
    enum: [
      'draft',
      'gathering',
      'pending',
      'launched',
      'finished',
      'aborted',
    ],
    default: 'draft',
    index: true,
  },
  players: {
    type: [PlayerSchema],
    default: [],
  },
  minPlayers: {
    type: Number,
    required: true,
  },
  maxPlayers: {
    type: Number,
    required: true,
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
      ret.game = ret.game.toString();
      ret.owner = ret.owner.toString();
      return ret;
    },
    /* eslint-enable no-param-reassign */
  },
});

module.exports = MatchSchema;
