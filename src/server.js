require('dotenv').config();
const express = require('express');
const { sequelize } = require('./models');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const routes = require('./routes');
const { errorHandler, AppError } = require('./utils/errorHandler');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

const app = express();

// ============ MIDDLEWARE ============

// Security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Stripe webhook handling (needs raw body)
app.use(
    '/api/v1/payments/webhook',
    express.raw({ type: 'application/json' })
);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Compression
app.use(compression());

// CORS
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    })
);

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// ============ ROUTES ============

app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

// Handle undefined routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

// ============ DATABASE & SERVER ============

const PORT = process.env.PORT || 5000;
let server;

sequelize
    .authenticate()
    .then(() => {
        console.log('✅ MySQL connection established successfully!');
        
        // Sync database (creates tables if they don't exist)
        return sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    })
    .then(() => {
        console.log('✅ Database synchronized!');

        server = app.listen(PORT, () => {
            console.log(`🚀 App running on port ${PORT}...`);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            console.log('UNHANDLED REJECTION! 💥 Shutting down...');
            console.log(err.name, err.message);
            server.close(() => {
                process.exit(1);
            });
        });
    })
    .catch((err) => {
        console.error('❌ Database Connection Error:', err);
        process.exit(1);
    });

// Handle SIGTERM
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});
