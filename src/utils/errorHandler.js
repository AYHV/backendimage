/**
 * Custom Error Class
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Mongoose bad ObjectId
        if (err.name === 'CastError') {
            error = handleCastErrorDB(error);
        }

        // Mongoose duplicate key
        if (err.code === 11000) {
            error = handleDuplicateFieldsDB(error);
        }

        // Mongoose validation error
        if (err.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
        }

        // JWT errors
        if (err.name === 'JsonWebTokenError') {
            error = handleJWTError();
        }

        if (err.name === 'TokenExpiredError') {
            error = handleJWTExpiredError();
        }

        // Multer errors
        if (err.name === 'MulterError') {
            error = handleMulterError(error);
        }

        sendErrorProd(error, res);
    }
};

/**
 * Send detailed error in development
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

/**
 * Send limited error info in production
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
        });
    } else {
        // Programming or unknown error: don't leak error details
        console.error('ERROR 💥', err);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Something went wrong!',
        });
    }
};

/**
 * Handle Mongoose CastError
 */
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

/**
 * Handle Mongoose duplicate key error
 */
const handleDuplicateFieldsDB = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value: ${field} = '${value}'. Please use another value.`;
    return new AppError(message, 400);
};

/**
 * Handle Mongoose validation error
 */
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

/**
 * Handle JWT error
 */
const handleJWTError = () =>
    new AppError('Invalid token. Please log in again.', 401);

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = () =>
    new AppError('Your token has expired. Please log in again.', 401);

/**
 * Handle Multer errors
 */
const handleMulterError = (err) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return new AppError('File size is too large. Maximum size is 10MB.', 400);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return new AppError('Too many files uploaded.', 400);
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return new AppError('Unexpected field in file upload.', 400);
    }
    return new AppError(err.message, 400);
};

/**
 * Async error wrapper
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

module.exports = {
    AppError,
    errorHandler,
    catchAsync,
};
