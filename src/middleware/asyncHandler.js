/**
 * Wraps an async route handler or controller to catch any unhandled promise rejections
 * and pass them to Express next() error handler.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
