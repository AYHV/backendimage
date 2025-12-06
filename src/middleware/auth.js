const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/errorHandler');

/**
 * Protect routes - Verify JWT access token
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        // Check if token exists
        if (!token) {
            return next(
                new AppError('You are not logged in. Please log in to get access.', 401)
            );
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Check if user still exists
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return next(
                new AppError('The user belonging to this token no longer exists.', 401)
            );
        }

        // Check if user is active
        if (!user.isActive) {
            return next(
                new AppError('Your account has been deactivated. Please contact support.', 401)
            );
        }

        // Grant access to protected route
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token. Please log in again.', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Your token has expired. Please log in again.', 401));
        }
        next(error);
    }
};

/**
 * Restrict routes to specific roles
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError('You do not have permission to perform this action.', 403)
            );
        }
        next();
    };
};

/**
 * Optional authentication - Attach user if token is valid, but don't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const user = await User.findByPk(decoded.id);
            if (user && user.isActive) {
                req.user = user;
            }
        }
        next();
    } catch (error) {
        // If token is invalid, just continue without user
        next();
    }
};

module.exports = {
    protect,
    restrictTo,
    optionalAuth,
};
