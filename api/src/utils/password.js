const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

function withPepper(password) {
  return `${String(password)}:${env.passwordHashKey}`;
}

async function hashPassword(password) {
  return bcrypt.hash(withPepper(password), 12);
}

async function comparePassword(password, hashed) {
  return bcrypt.compare(withPepper(password), hashed);
}

function generatePasswordHashKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  hashPassword,
  comparePassword,
  generatePasswordHashKey
};
