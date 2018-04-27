'use strict';

const express = require('express');
const app = express();

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

const ServerFunctions = require(process.cwd() + '/controllers/serverFunctions');
const sf = new ServerFunctions();

app.use(express.static('public'));

app.get('/', (req, res) => {
  return res.sendFile(__dirname + '/views/index.html');
});

app.get('/new', sf.saveNewSite);

app.get('/:code', sf.fetchSite);

app.listen(process.env.PORT);