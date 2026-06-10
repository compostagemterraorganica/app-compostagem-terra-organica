function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(status).json({
    success: false,
    error: err.message || 'Erro interno',
    details: err.details || undefined
  });
}

module.exports = { errorHandler };
