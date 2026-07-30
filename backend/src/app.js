// backend/src/app.js
const express = require('express');
const cors    = require('cors');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/players',       require('./routes/player.routes'));
app.use('/api/meta-upgrades', require('./routes/metaUpgrade.routes'));
app.use('/api/runs',          require('./routes/run.routes'));

app.use(errorMiddleware);

module.exports = app;
