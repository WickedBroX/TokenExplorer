const { ApiError, handleUpstreamError } = require('../utils/errors');
const holdersService = require('../services/holdersService');

describe('holdersService', () => {
  describe('fetchHolders', () => {
    it('should handle API errors gracefully', async () => {
      // This is a placeholder test - would need proper mocking
      expect(typeof holdersService.fetchHolders).toBe('function');
    });
  });
});

describe('Error utilities', () => {
  it('should create ApiError with correct properties', () => {
    const error = new ApiError('Test error', 'TEST_CODE', 400);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
  });

  it('should handle upstream errors', () => {
    const mockError = {
      response: {
        status: 500,
        data: { message: 'Upstream failed' }
      }
    };

    expect(() => {
      handleUpstreamError(mockError, 'TestService');
    }).toThrow();
  });
});
