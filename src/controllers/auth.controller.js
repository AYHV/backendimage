const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { AppError, catchAsync } = require('../utils/errorHandler');
const { sendWelcomeEmail } = require('../services/email.service');

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = catchAsync(async (req, res, next) => {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        return next(new AppError('Email already registered', 400));
    }

    // Create user
    const user = await User.create({
        name,
        email,
        password,
        phone,
        role: 'client', // Default role
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Send welcome email (don't wait for it)
    sendWelcomeEmail(email, name).catch((err) =>
        console.error('Failed to send welcome email:', err)
    );

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            accessToken,
            refreshToken,
        },
    });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ where: { email } });

    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
        return next(new AppError('Invalid email or password', 401));
    }

    // Check if user is active
    if (!user.isActive) {
        return next(
            new AppError('Your account has been deactivated. Please contact support.', 401)
        );
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Save refresh token and update last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            accessToken,
            refreshToken,
        },
    });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
const refreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken: token } = req.body;

    if (!token) {
        return next(new AppError('Refresh token is required', 400));
    }

    // Verify refresh token
    let decoded;
    try {
        decoded = verifyRefreshToken(token);
    } catch (error) {
        return next(new AppError('Invalid or expired refresh token', 401));
    }

    // Find user and check if refresh token matches
    const user = await User.findByPk(decoded.id);

    if (!user || user.refreshToken !== token) {
        return next(new AppError('Invalid refresh token', 401));
    }

    if (!user.isActive) {
        return next(new AppError('Account has been deactivated', 401));
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            accessToken,
            refreshToken: newRefreshToken,
        },
    });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = catchAsync(async (req, res, next) => {
    const user = await User.findByPk(req.user.id);

    res.status(200).json({
        success: true,
        data: {
            user,
        },
    });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = catchAsync(async (req, res, next) => {
    // Clear refresh token
    const user = await User.findByPk(req.user.id);
    user.refreshToken = null;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
const updateProfile = catchAsync(async (req, res, next) => {
    const { name, phone, address } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    await user.update({ name, phone, address });

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user,
        },
    });
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findByPk(req.user.id);
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Check current password
    if (!(await user.comparePassword(currentPassword))) {
        return next(new AppError('Current password is incorrect', 401));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password changed successfully',
    });
});

module.exports = {
    register,
    login,
    refreshToken,
    getMe,
    logout,
    updateProfile,
    changePassword,
};
