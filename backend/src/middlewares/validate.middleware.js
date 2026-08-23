export function validateMiddleware(schema) {
  return (req, res, next) => {
    next();
  };
}
