const { Schema } = require('mongoose');

/* eslint-disable no-param-reassign */
module.exports = new Schema({
  read: {
    type: [String],
  },
  write: {
    type: [String],
  },
}, {
  _id: false,
  id: false,
  timestamps: false,
});
