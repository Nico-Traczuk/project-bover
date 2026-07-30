// backend/src/services/auth.service.js
const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const playerModel = require('../models/player.model');

const SALT_ROUNDS = 12;

async function register({ username, email, password }) {
  if (!username || !email || !password) {
    const err = new Error('username, email and password are required');
    err.status = 400;
    err.code   = 'VALIDATION_ERROR';
    throw err;
  }

  const existing = await playerModel.findByEmail(email);
  if (existing) {
    const err = new Error('Email already in use');
    err.status = 409;
    err.code   = 'EMAIL_EXISTS';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const player       = await playerModel.createPlayer({ username, email, passwordHash });
  const token        = jwt.sign({ playerId: player.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return { player, token };
}

async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error('email and password are required');
    err.status = 400;
    err.code   = 'VALIDATION_ERROR';
    throw err;
  }

  const player = await playerModel.findByEmail(email);
  if (!player) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code   = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await bcrypt.compare(password, player.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code   = 'INVALID_CREDENTIALS';
    throw err;
  }

  const { password_hash, ...playerData } = player;
  const token = jwt.sign({ playerId: player.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return { player: playerData, token };
}

module.exports = { register, login };
