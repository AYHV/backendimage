const cloudinary = require('cloudinary').v2;
const { AppError } = require('./errorHandler');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 */
const uploadImage = async (fileBuffer, folder = 'portfolio') => {
    try {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `photographer-portfolio/${folder}`,
                    resource_type: 'image',
                    transformation: [
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                },
                (error, result) => {
                    if (error) {
                        reject(new AppError('Failed to upload image', 500));
                    } else {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                            format: result.format,
                            width: result.width,
                            height: result.height,
                            size: result.bytes,
                        });
                    }
                }
            );
            uploadStream.end(fileBuffer);
        });
    } catch (error) {
        throw new AppError('Image upload failed', 500);
    }
};

/**
 * Upload multiple images
 */
const uploadMultipleImages = async (files, folder = 'portfolio') => {
    try {
        const uploadPromises = files.map((file) =>
            uploadImage(file.buffer, folder)
        );
        return await Promise.all(uploadPromises);
    } catch (error) {
        throw new AppError('Failed to upload images', 500);
    }
};

/**
 * Delete image from Cloudinary
 */
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        if (result.result !== 'ok') {
            throw new AppError('Failed to delete image', 500);
        }
        return result;
    } catch (error) {
        throw new AppError('Image deletion failed', 500);
    }
};

/**
 * Delete multiple images
 */
const deleteMultipleImages = async (publicIds) => {
    try {
        const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
        return await Promise.all(deletePromises);
    } catch (error) {
        throw new AppError('Failed to delete images', 500);
    }
};

/**
 * Generate thumbnail URL
 */
const generateThumbnail = (publicId, width = 300, height = 300) => {
    return cloudinary.url(publicId, {
        transformation: [
            { width, height, crop: 'fill', gravity: 'auto' },
            { quality: 'auto', fetch_format: 'auto' },
        ],
    });
};

/**
 * Add watermark to image
 */
const addWatermark = (publicId, watermarkText = '© Photographer') => {
    return cloudinary.url(publicId, {
        transformation: [
            {
                overlay: {
                    font_family: 'Arial',
                    font_size: 40,
                    text: watermarkText,
                },
                gravity: 'south_east',
                x: 10,
                y: 10,
                opacity: 50,
            },
        ],
    });
};

module.exports = {
    cloudinary,
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    deleteMultipleImages,
    generateThumbnail,
    addWatermark,
};
