const cloudinary = require('cloudinary').v2;
const { AppError } = require('../utils/errorHandler');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Check if Cloudinary is properly configured
const isCloudinaryConfigured = () => {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};

/**
 * Upload image to Cloudinary
 */
const uploadImage = async (fileBuffer, folder = 'portfolio') => {
    try {
        // Check if Cloudinary is configured
        if (!isCloudinaryConfigured()) {
            console.warn('Cloudinary not configured, returning mock data');
            // Return mock data for development
            return {
                url: `https://via.placeholder.com/800x600/cccccc/666666?text=${folder}`,
                publicId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                format: 'jpg',
                width: 800,
                height: 600,
                size: fileBuffer.length,
            };
        }

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
                        console.error('Cloudinary upload error:', error);
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
        console.error('Upload image error:', error);
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
        // Check if Cloudinary is configured
        if (!isCloudinaryConfigured()) {
            console.warn('Cloudinary not configured, skipping deletion for:', publicId);
            return { result: 'ok', message: 'Cloudinary not configured' };
        }

        console.log('Deleting image from Cloudinary:', publicId);
        const result = await cloudinary.uploader.destroy(publicId);
        console.log('Deletion result:', result);
        
        if (result.result !== 'ok' && result.result !== 'not found') {
            throw new AppError('Failed to delete image from Cloudinary', 500);
        }
        return result;
    } catch (error) {
        console.error('Image deletion error:', error);
        throw new AppError('Image deletion failed', 500);
    }
};

/**
 * Delete multiple images
 */
const deleteMultipleImages = async (publicIds) => {
    try {
        if (!publicIds || publicIds.length === 0) {
            console.log('No images to delete');
            return [];
        }

        console.log(`Deleting ${publicIds.length} images from Cloudinary:`, publicIds);
        const deletePromises = publicIds.map((publicId) => 
            deleteImage(publicId).catch(err => {
                console.error(`Failed to delete ${publicId}:`, err);
                return { result: 'error', publicId, error: err.message };
            })
        );
        const results = await Promise.all(deletePromises);
        console.log('All deletion results:', results);
        return results;
    } catch (error) {
        console.error('Failed to delete images:', error);
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
    isCloudinaryConfigured,
};
