const { HttpError } = require('../utils/httpError');

function requireAdmin(req, res, next) {
  if (!req.auth?.isAdministrator) {
    return next(new HttpError(403, 'Acesso restrito a administradores'));
  }
  next();
}

module.exports = { requireAdmin };
