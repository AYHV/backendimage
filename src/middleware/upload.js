const multer = require('multer');
const path = require('path');
const { AppError } = require('../utils/errorHandler');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
    // Allowed image extensions
    const allowedExtensions = /jpeg|jpg|png|gif|webp/;
    const extname = allowedExtensions.test(
        path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedExtensions.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(
            new AppError(
                'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
                400
            )
        );
    }
};

// Configure multer upload
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    },
    fileFilter: fileFilter,
});

// Middleware for single image upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// Middleware for multiple images upload
const uploadMultiple = (fieldName, maxCount = 10) =>
    upload.array(fieldName, maxCount);

// Middleware for mixed fields
const uploadFields = (fields) => upload.fields(fields);

module.exports = {
    upload,
    uploadSingle,
    uploadMultiple,
    uploadFields,
};
