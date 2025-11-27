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
    const query = {};
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (popular !== undefined) query.popular = popular === 'true';

    const packages = await Package.find(query).sort('price');

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
    const package = await Package.findById(req.params.id);

    if (!package) {
        return next(new AppError('Package not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            package,
        },
    });
});

/**
 * @desc    Create package
 * @route   POST /api/v1/packages
 * @access  Private/Admin
 */
const createPackage = catchAsync(async (req, res, next) => {
    const package = await Package.create(req.body);

    res.status(201).json({
        success: true,
        message: 'Package created successfully',
        data: {
            package,
        },
    });
});

/**
 * @desc    Update package
 * @route   PUT /api/v1/packages/:id
 * @access  Private/Admin
 */
const updatePackage = catchAsync(async (req, res, next) => {
    let package = await Package.findById(req.params.id);

    if (!package) {
        return next(new AppError('Package not found', 404));
    }

    package = await Package.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        success: true,
        message: 'Package updated successfully',
        data: {
            package,
        },
    });
});

/**
 * @desc    Delete package
 * @route   DELETE /api/v1/packages/:id
 * @access  Private/Admin
 */
const deletePackage = catchAsync(async (req, res, next) => {
    const package = await Package.findById(req.params.id);

    if (!package) {
        return next(new AppError('Package not found', 404));
    }

    await package.deleteOne();

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
