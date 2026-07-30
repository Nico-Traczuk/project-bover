// backend/src/middleware/error.middleware.js
function errorMiddleware(err, req, res, next) {
  const status  = err.status  || 500;
  const code    = err.code    || 'INTERNAL_ERROR';
  const message = err.message || 'Something went wrong';

  res.status(status).json({
    success: false,
    error: { code, message }
  });
}

module.exports = errorMiddleware;
