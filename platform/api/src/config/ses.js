const {
  SESv2Client,
  SendEmailCommand,
  GetEmailIdentityCommand,
  GetAccountCommand
} = require('@aws-sdk/client-sesv2');
const { HttpError } = require('../utils/httpError');

let sesClient = null;

function hasAwsCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) return true;
  if (process.env.AWS_PROFILE?.trim()) return true;
  return false;
}

function isSesConfigured() {
  return Boolean(process.env.AWS_REGION?.trim() && process.env.SES_FROM?.trim());
}

function getSesConfig() {
  const region = process.env.AWS_REGION || '';
  const from = String(process.env.SES_FROM || '').trim();
  return { region, from };
}

function parseFromAddress(from) {
  const trimmed = String(from || '').trim();
  const named = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (named) {
    return { displayName: named[1].trim(), email: named[2].trim() };
  }
  return { displayName: null, email: trimmed };
}

function formatFromAddress({ displayName, email }) {
  if (displayName) return `${displayName} <${email}>`;
  return email;
}

function assertSesConfigured() {
  const { region, from } = getSesConfig();
  if (!region) throw new HttpError(500, 'AWS_REGION nao configurado');
  if (!from) throw new HttpError(500, 'SES_FROM nao configurado');
  const { email } = parseFromAddress(from);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(500, `SES_FROM invalido: "${from}"`);
  }
}

function getSesClient() {
  if (sesClient) return sesClient;
  assertSesConfigured();
  sesClient = new SESv2Client({ region: getSesConfig().region });
  return sesClient;
}

async function getAccountInfo() {
  try {
    const response = await getSesClient().send(new GetAccountCommand({}));
    return {
      productionAccessEnabled: Boolean(response.ProductionAccessEnabled),
      available: true
    };
  } catch (error) {
    if (error.name === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
      return { productionAccessEnabled: null, available: false };
    }
    throw error;
  }
}

async function getIdentityStatus(emailOrDomain) {
  const identity = String(emailOrDomain).trim();
  try {
    const response = await getSesClient().send(
      new GetEmailIdentityCommand({ EmailIdentity: identity })
    );
    return {
      identity,
      verified: response.VerifiedForSendingStatus === true,
      verificationStatus: response.VerificationStatus || 'UNKNOWN',
      checkAvailable: true
    };
  } catch (error) {
    if (error.name === 'NotFoundException') {
      return {
        identity,
        verified: false,
        verificationStatus: 'NOT_FOUND',
        checkAvailable: true
      };
    }
    if (error.name === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
      return {
        identity,
        verified: null,
        verificationStatus: 'ACCESS_DENIED',
        checkAvailable: false
      };
    }
    throw error;
  }
}

async function sendEmail({ to, subject, html, text }) {
  assertSesConfigured();
  const { from } = getSesConfig();
  const parsed = parseFromAddress(from);

  const response = await getSesClient().send(
    new SendEmailCommand({
      FromEmailAddress: formatFromAddress(parsed),
      Destination: { ToAddresses: [String(to).trim()] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            ...(html ? { Html: { Data: html, Charset: 'UTF-8' } } : {}),
            ...(text ? { Text: { Data: text, Charset: 'UTF-8' } } : {})
          }
        }
      }
    })
  );

  return { messageId: response.MessageId };
}

module.exports = {
  hasAwsCredentials,
  isSesConfigured,
  getSesConfig,
  parseFromAddress,
  formatFromAddress,
  assertSesConfigured,
  getSesClient,
  getAccountInfo,
  getIdentityStatus,
  sendEmail
};
