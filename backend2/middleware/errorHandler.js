export const notFoundHandler = (req, res) => {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  return res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message
    },
    message
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] Request ID ${req.id || "N/A"}:`, err);

  const status = err.status || err.statusCode || 500;
  const code =
    err.code && typeof err.code === "string"
      ? err.code
      : status === 400
      ? "BAD_REQUEST"
      : status === 401
      ? "UNAUTHORIZED"
      : status === 403
      ? "FORBIDDEN"
      : status === 404
      ? "NOT_FOUND"
      : status === 409
      ? "CONFLICT"
      : status === 429
      ? "RATE_LIMIT_EXCEEDED"
      : "INTERNAL_SERVER_ERROR";

  const message = err.message || "An unexpected internal server error occurred.";

  return res.status(status).json({
    success: false,
    error: {
      code,
      message
    },
    message
  });
};

export default {
  notFoundHandler,
  errorHandler
};
