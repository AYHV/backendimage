const Joi = require('joi');
const { AppError } = require('../utils/errorHandler');

/**
 * Validate request body, params, or query against a Joi schema
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errorMessage = error.details
                .map((detail) => detail.message)
                .join(', ');
            return next(new AppError(errorMessage, 400));
        }

        // Replace request property with validated value
        req[property] = value;
        next();
    };
};

// ============ AUTH VALIDATION SCHEMAS ============

const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 100 characters',
    }),
    email: Joi.string().email().lowercase().trim().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
    }),
    password: Joi.string().min(8).required().messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
    }),
    phone: Joi.string().trim().optional(),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address',
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required',
    }),
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'string.empty': 'Refresh token is required',
    }),
});

// ============ PORTFOLIO VALIDATION SCHEMAS ============

const createPortfolioSchema = Joi.object({
    title: Joi.string().trim().max(200).required(),
    description: Joi.string().max(2000).required(),
    category: Joi.string()
        .valid('Wedding', 'Portrait', 'Studio', 'Event', 'Product')
        .required(),
    tags: Joi.array().items(Joi.string()).optional(),
    location: Joi.string().optional(),
    shootDate: Joi.date().optional(),
    client: Joi.string().trim().optional(),
    featured: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
});

const updatePortfolioSchema = Joi.object({
    title: Joi.string().trim().max(200).optional(),
    description: Joi.string().max(2000).optional(),
    category: Joi.string()
        .valid('Wedding', 'Portrait', 'Studio', 'Event', 'Product')
        .optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    location: Joi.string().optional(),
    shootDate: Joi.date().optional(),
    client: Joi.string().trim().optional(),
    featured: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
});

// ============ PACKAGE VALIDATION SCHEMAS ============

const createPackageSchema = Joi.object({
    name: Joi.string().trim().required(),
    description: Joi.string().required(),
    price: Joi.number().min(0).required(),
    duration: Joi.object({
        value: Joi.number().required(),
        unit: Joi.string().valid('hours', 'days').required(),
    }).required(),
    features: Joi.array()
        .items(
            Joi.object({
                name: Joi.string().required(),
                included: Joi.boolean().default(true),
            })
        )
        .optional(),
    deliverables: Joi.object({
        editedPhotos: Joi.number().min(0).default(0),
        rawPhotos: Joi.number().min(0).default(0),
        printRights: Joi.boolean().default(false),
        onlineGallery: Joi.boolean().default(true),
    }).optional(),
    category: Joi.string()
        .valid('Wedding', 'Portrait', 'Studio', 'Event', 'Product')
        .required(),
    isActive: Joi.boolean().optional(),
    popular: Joi.boolean().optional(),
    maxBookingsPerDay: Joi.number().min(1).default(1),
    depositPercentage: Joi.number().min(0).max(100).default(50),
});

const updatePackageSchema = Joi.object({
    name: Joi.string().trim().optional(),
    description: Joi.string().optional(),
    price: Joi.number().min(0).optional(),
    duration: Joi.object({
        value: Joi.number().required(),
        unit: Joi.string().valid('hours', 'days').required(),
    }).optional(),
    features: Joi.array()
        .items(
            Joi.object({
                name: Joi.string().required(),
                included: Joi.boolean().default(true),
            })
        )
        .optional(),
    deliverables: Joi.object({
        editedPhotos: Joi.number().min(0),
        rawPhotos: Joi.number().min(0),
        printRights: Joi.boolean(),
        onlineGallery: Joi.boolean(),
    }).optional(),
    category: Joi.string()
        .valid('Wedding', 'Portrait', 'Studio', 'Event', 'Product')
        .optional(),
    isActive: Joi.boolean().optional(),
    popular: Joi.boolean().optional(),
    maxBookingsPerDay: Joi.number().min(1).optional(),
    depositPercentage: Joi.number().min(0).max(100).optional(),
});

// ============ BOOKING VALIDATION SCHEMAS ============

const createBookingSchema = Joi.object({
    packageId: Joi.string().required().messages({
        'string.empty': 'Package ID is required',
    }),
    bookingDate: Joi.date().required().messages({
        // 'date.greater': 'Booking date must be in the future',
        'any.required': 'Booking date is required',
    }),
    bookingTime: Joi.string().required().messages({
        'string.empty': 'Booking time is required',
    }),
    location: Joi.string().trim().optional(),
    notes: Joi.string().max(1000).optional(),
    contactInfo: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().allow('').optional(),
        phone: Joi.string().required(),
    }).required(),
    selectedPoses: Joi.array().items(Joi.string()).optional().messages({
        'array.base': 'Selected poses must be an array of strings'
    }),
});

const updateBookingStatusSchema = Joi.object({
    status: Joi.string()
        .valid('Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled')
        .required(),
    cancellationReason: Joi.string().when('status', {
        is: 'Cancelled',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
});

// ============ DELIVERY VALIDATION SCHEMAS ============

const createDeliverySchema = Joi.object({
    albumName: Joi.string().trim().required(),
    description: Joi.string().max(1000).optional(),
    expiresAt: Joi.date().greater('now').optional(),
    password: Joi.string().optional(),
    isPublic: Joi.boolean().default(false),
    allowDownload: Joi.boolean().default(true),
    watermarkEnabled: Joi.boolean().default(false),
});

module.exports = {
    validate,
    // Auth
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    // Portfolio
    createPortfolioSchema,
    updatePortfolioSchema,
    // Package
    createPackageSchema,
    updatePackageSchema,
    // Booking
    createBookingSchema,
    updateBookingStatusSchema,
    // Delivery
    createDeliverySchema,
};
