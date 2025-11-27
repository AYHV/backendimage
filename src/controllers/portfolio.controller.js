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
        sort = '-createdAt',
    } = req.query;

    // Build query
    const query = {};
    if (category) query.category = category;
    if (featured !== undefined) query.featured = featured === 'true';
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const portfolio = await Portfolio.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Portfolio.countDocuments(query);

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
    const portfolio = await Portfolio.findById(req.params.id);

    if (!portfolio) {
        return next(new AppError('Portfolio item not found', 404));
    }

    // Increment views
    portfolio.views += 1;
    await portfolio.save({ validateBeforeSave: false });

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
    const portfolioData = req.body;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
        const uploadedImages = await uploadMultipleImages(req.files, 'portfolio');
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
    }

    const portfolio = await Portfolio.create(portfolioData);

    res.status(201).json({
        success: true,
        message: 'Portfolio item created successfully',
        data: {
            portfolio,
        },
    });
});

/**
 * @desc    Update portfolio item
 * @route   PUT /api/v1/portfolio/:id
 * @access  Private/Admin
 */
const updatePortfolio = catchAsync(async (req, res, next) => {
    let portfolio = await Portfolio.findById(req.params.id);

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

    portfolio = await Portfolio.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

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
    const portfolio = await Portfolio.findById(req.params.id);

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

    await portfolio.deleteOne();

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
    const portfolio = await Portfolio.findById(req.params.id);

    if (!portfolio) {
        return next(new AppError('Portfolio item not found', 404));
    }

    const imageIndex = portfolio.images.findIndex(
        (img) => img._id.toString() === req.params.imageId
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
