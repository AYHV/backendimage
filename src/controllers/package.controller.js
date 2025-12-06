const Package = require('../models/Package');
const { AppError, catchAsync } = require('../utils/errorHandler');

/**
 * @desc    Get all packages
 * @route   GET /api/v1/packages
 * @access  Public
 */
const getAllPackages = catchAsync(async (req, res, next) => {
    const { category, isActive = 'true', popular } = req.query;

    // Build query
    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (popular !== undefined) where.popular = popular === 'true';

    const packages = await Package.findAll({
        where,
        order: [['price', 'ASC']]
    });

    res.status(200).json({
        success: true,
        count: packages.length,
        data: {
            packages,
        },
    });
});

/**
 * @desc    Get single package
 * @route   GET /api/v1/packages/:id
 * @access  Public
 */
const getPackageById = catchAsync(async (req, res, next) => {
    const pkg = await Package.findByPk(req.params.id);

    if (!pkg) {
        return next(new AppError('Package not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            package: pkg,
        },
    });
});

/**
 * @desc    Create package
 * @route   POST /api/v1/packages
 * @access  Private/Admin
 */
const createPackage = catchAsync(async (req, res, next) => {
    const pkg = await Package.create(req.body);

    res.status(201).json({
        success: true,
        message: 'Package created successfully',
        data: {
            package: pkg,
        },
    });
});

/**
 * @desc    Update package
 * @route   PUT /api/v1/packages/:id
 * @access  Private/Admin
 */
const updatePackage = catchAsync(async (req, res, next) => {
    const pkg = await Package.findByPk(req.params.id);

    if (!pkg) {
        return next(new AppError('Package not found', 404));
    }

    await pkg.update(req.body);

    res.status(200).json({
        success: true,
        message: 'Package updated successfully',
        data: {
            package: pkg,
        },
    });
});

/**
 * @desc    Delete package
 * @route   DELETE /api/v1/packages/:id
 * @access  Private/Admin
 */
const deletePackage = catchAsync(async (req, res, next) => {
    const pkg = await Package.findByPk(req.params.id);

    if (!pkg) {
        return next(new AppError('Package not found', 404));
    }

    await pkg.destroy();

    res.status(200).json({
        success: true,
        message: 'Package deleted successfully',
    });
});

module.exports = {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
};
