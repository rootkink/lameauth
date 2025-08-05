/* NOTE: Create Error Plugin
 * */

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
  serialize() {
    return {
      error: {
        type: this.name,
        statusCode: this.statusCode,
        message: this.message,
      },
    };
  }
}

class BadRequest extends HttpError {
  constructor(statusCode, message) {
    super(statusCode, message);
    this.name = this.constructor.name;
  }
}
