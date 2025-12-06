const Portfolio = require('../models/Portfolio');
const { AppError, catchAsync } = require('../utils/errorHandler');
const {
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    deleteMultipleImages,
} = require('../services/cloudinary.service');

/**
 * @desc    Get all portfolio items
 * @route   GET /api/v1/portfolio
 * @access  Public
 */
const getAllPortfolio = catchAsync(async (req, res, next) => {
    const {
        category,
        featured,
        isPublished = 'true',
        page = 1,
        limit = 12,
        sort = 'createdAt',
        order = 'DESC',
    } = req.query;

    // Build query
    const where = {};
    if (category) where.category = category;
    if (featured !== undefined) where.featured = featured === 'true';
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';

    // Execute query with pagination
    const offset = (page - 1) * limit;
    const { count: total, rows: portfolio } = await Portfolio.findAndCountAll({
        where,
        order: [[sort.replace('-', ''), order]],
        offset,
        limit: parseInt(limit),
    });

    res.status(200).json({
        success: true,
        count: portfolio.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: {
            portfolio,
        },
    });
});

/**
 * @desc    Get single portfolio item
 * @route   GET /api/v1/portfolio/:id
 * @access  Public
 */
const getPortfolioById = catchAsync(async (req, res, next) => {
    const portfolio = await Portfolio.findByPk(req.params.id);

    if (!portfolio) {
        return next(new AppError('Portfolio item not found', 404));
    }

    // Increment views
    portfolio.views += 1;
    await portfolio.save({ validate: false });

    res.status(200).json({
        success: true,
        data: {
            portfolio,
        },
    });
});

/**
 * @desc    Create portfolio item
 * @route   POST /api/v1/portfolio
 * @access  Private/Admin
 */
const createPortfolio = catchAsync(async (req, res, next) => {
    console.log('Creating portfolio item with data:', req.body);
    console.log('Files received:', req.files ? req.files.length : 0);
    
    const portfolioData = req.body;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
        try {
            console.log('Uploading images to Cloudinary...');
            const uploadedImages = await uploadMultipleImages(req.files, 'portfolio');
            console.log('Images uploaded successfully:', uploadedImages.length);
            
            portfolioData.images = uploadedImages.map((img, index) => ({
                url: img.url,
                publicId: img.publicId,
                order: index,
            }));

            // Set first image as cover if not provided
            if (!portfolioData.coverImage && uploadedImages.length > 0) {
                portfolioData.coverImage = {
                    url: uploadedImages[0].url,
                    publicId: uploadedImages[0].publicId,
                };
            }
        } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
            return next(new AppError('Failed to upload images', 500));
        }
    }

    try {
        console.log('Creating portfolio item in database...');
        const portfolio = await Portfolio.create(portfolioData);
        console.log('Portfolio item created successfully:', portfolio.id);

        res.status(201).json({
            success: true,
            message: 'Portfolio item created successfully',
            data: {
                portfolio,
            },
        });
    } catch (dbError) {
        console.error('Database error:', dbError);
        return next(new AppError('Failed to create portfolio item', 500));
    }
});

/**
 * @desc    Update portfolio item
 * @route   PUT /api/v1/portfolio/:id
 * @access  Private/Admin
 */
const updatePortfolio = catchAsync(async (req, res, next) => {
    const portfolio = await Portfolio.findByPk(req.params.id);

    if (!portfolio) {
        return next(new AppError('Portfolio item not found', 404));
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
        const uploadedImages = await uploadMultipleImages(req.files, 'portfolio');
        const newImages = uploadedImages.map((img, index) => ({
            url: img.url,
            publicId: img.publicId,
            order: portfolio.images.length + index,
        }));
        req.body.images = [...portfolio.images, ...newImages];
    }

    await portfolio.update(req.body);

    res.status(200).json({
        success: true,
        message: 'Portfolio item updated successfully',
        data: {
            portfolio,
        },
    });
});

/**
 * @desc    Delete portfolio item
 * @route   DELETE /api/v1/portfolio/:id
 * @access  Private/Admin
 */
const deletePortfolio = catchAsync(async (req, res, next) => {
    const portfolio = await Portfolio.findByPk(req.params.id);

    if (!portfolio) {
        return next(new AppError('Portfolio item not found', 404));
    }

    // Delete images from Cloudinary
    const publicIds = portfolio.images.map((img) => img.publicId);
    if (portfolio.coverImage && portfolio.coverImage.publicId) {
        publicIds.push(portfolio.coverImage.publicId);
    }

    if (publicIds.length > 0) {
        await deleteMultipleImages(publicIds).catch((err) =>
            console.error('Failed to delete images:', err)
        );
    }

    await portfolio.destroy();

    res.status(200).json({
        success: true,
        message: 'Portfolio item deleted successfully',
    });
});

/**
 * @desc    Delete image from portfolio
 * @route   DELETE /api/v1/portfolio/:id/images/:imageId
 * @access  Private/Admin
 */
const deletePortfolioImage = catchAsync(async (req, res, next) => {
    const portfolio = await Portfolio.findByPk(req.params.id);

    if (!portfolio) {
        return next(new AppError('Portfolio item not found', 404));
    }

    const imageIndex = portfolio.images.findIndex(
        (img) => img.id === req.params.imageId
    );

    if (imageIndex === -1) {
        return next(new AppError('Image not found', 404));
    }

    const image = portfolio.images[imageIndex];

    // Delete from Cloudinary
    await deleteImage(image.publicId);

    // Remove from array
    portfolio.images.splice(imageIndex, 1);
    await portfolio.save();

    res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
        data: {
            portfolio,
        },
    });
});

module.exports = {
    getAllPortfolio,
    getPortfolioById,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    deletePortfolioImage,
};
