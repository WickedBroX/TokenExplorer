/**
 * Custom error classes for standardized error handling
 */

class ApiError extends Error {
  constructor(message, code = 'API_ERROR', statusCode = 500, isOperational = true) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApiError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends ApiError {
  constructor(resource) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

class UpstreamError extends ApiError {
  constructor(message, upstreamResponse) {
    super(message, 'UPSTREAM_ERROR', 502);
    this.name = 'UpstreamError';
    this.upstreamResponse = upstreamResponse;
  }
}

class RateLimitError extends ApiError {
  constructor(retryAfter) {
    const msg = `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`;
    super(msg, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Handles upstream API errors consistently
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @throws {UpstreamError}
 */
function handleUpstreamError(error, context) {
  const message = error.response?.data?.message || error.message || 'Upstream API error';
  
  console.error(`[${context}] Upstream error:`, {
    message,
    status: error.response?.status,
    data: error.response?.data,
  });

  throw new UpstreamError(
    `${context}: ${message}`,
    error.response?.data
  );
}

/**
 * Formats error for API response
 * @param {Error} error - The error to format
 * @returns {object} Formatted error response
 */
function formatErrorResponse(error) {
  if (error instanceof ApiError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        status: error.statusCode,
      },
    };
  }

  // Unknown error - don't expose details in production
  return {
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      code: 'INTERNAL_ERROR',
      status: 500,
    },
  };
}

module.exports = {
  ApiError,
  ValidationError,
  NotFoundError,
  UpstreamError,
  RateLimitError,
  handleUpstreamError,
  formatErrorResponse,
};
