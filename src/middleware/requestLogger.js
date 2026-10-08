/**
 * Lightweight request logger middleware for logging API activity.
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const icon = statusCode >= 400 ? '⚠️' : '⚡';
    console.log(`${icon} [${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
  });

  next();
};

export default requestLogger;
