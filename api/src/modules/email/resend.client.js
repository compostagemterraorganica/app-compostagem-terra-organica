const { Resend } = require('resend');
const env = require('../../config/env');

let client = null;

function getResendClient() {
  if (!env.resend.apiKey) return null;
  if (!client) client = new Resend(env.resend.apiKey);
  return client;
}

module.exports = { getResendClient };
