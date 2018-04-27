'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var Code = new Schema({
  id: Number,
  site: String
});

module.exports = mongoose.model('Code', Code);