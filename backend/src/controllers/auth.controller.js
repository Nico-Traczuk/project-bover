// backend/src/controllers/auth.controller.js
const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const data = await authService.register({ username, email, password });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const data = await authService.login({ email, password });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
