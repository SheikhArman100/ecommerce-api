class ApiError extends Error {
    public statusCode: number;
  
    constructor(statusCode: number, message?: string, stack?: string) {
      super(message || 'An error occurred');
      this.statusCode = statusCode;
  
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  export default ApiError;