const { Schema } = require('mongoose');

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
