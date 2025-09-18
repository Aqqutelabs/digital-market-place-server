// utils/appError.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Call parent constructor (Error) with the message

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // 'fail' for 4xx, 'error' for 5xx
    this.isOperational = true; // Mark as operational error (errors we can predict and handle)

    // Capture the stack trace to know where the error originated
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;