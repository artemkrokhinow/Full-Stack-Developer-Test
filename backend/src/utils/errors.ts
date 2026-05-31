export class DomainError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UserAlreadyExistsException extends DomainError {
  constructor(message: string = 'User with this email already exists') {
    super(message, 409);
  }
}

export class InvalidCredentialsException extends DomainError {
  constructor(message: string = 'Invalid email or password') {
    super(message, 401);
  }
}

export class OutOfStockException extends DomainError {
  constructor(message: string = 'Out of stock or race condition') {
    super(message, 409);
  }
}

export class ResourceNotFoundException extends DomainError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ReservationExpiredError extends DomainError {
  constructor() { 
    super('Reservation expired', 400); 
  }
}

export class InvalidReservationError extends DomainError {
  constructor(message: string = 'Invalid reservation') { 
    super(message, 400); 
  }
}
