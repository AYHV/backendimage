const Booking = require('../models/Booking');
const Package = require('../models/Package');
const { AppError, catchAsync } = require('../utils/errorHandler');
const { sendBookingConfirmationEmail, sendBookingCancellationEmail } = require('../services/email.service');

/**
 * @desc    Create new booking
 * @route   POST /api/v1/bookings
 * @access  Private
 */
const createBooking = catchAsync(async (req, res, next) => {
    const { packageId, bookingDate, bookingTime, location, notes, contactInfo } = req.body;

    // Get package details
    const package = await Package.findById(packageId);
    if (!package) {
        return next(new AppError('Package not found', 404));
    }

    if (!package.isActive) {
        return next(new AppError('This package is not available', 400));
    }

    // Check if date is available (check max bookings per day)
    const bookingsOnDate = await Booking.countDocuments({
        package: packageId,
        bookingDate: new Date(bookingDate),
        bookingStatus: { $nin: ['Cancelled'] },
    });

    if (bookingsOnDate >= package.maxBookingsPerDay) {
        return next(new AppError('This date is fully booked. Please choose another date.', 400));
    }

    // Calculate pricing
    const depositAmount = (package.price * package.depositPercentage) / 100;
    const remainingAmount = package.price - depositAmount;

    // Create booking
    const booking = await Booking.create({
        user: req.user.id,
        package: packageId,
        bookingDate,
        bookingTime,
        location,
        notes,
        contactInfo,
        pricing: {
            packagePrice: package.price,
            depositAmount,
            remainingAmount,
            totalPaid: 0,
        },
        paymentStatus: 'Pending',
        bookingStatus: 'Pending',
    });

    // Populate package details
    await booking.populate('package');

    res.status(201).json({
        success: true,
        message: 'Booking created successfully. Please proceed with payment.',
        data: {
            booking,
        },
    });
});

/**
 * @desc    Get all bookings (Admin)
 * @route   GET /api/v1/bookings
 * @access  Private/Admin
 */
const getAllBookings = catchAsync(async (req, res, next) => {
    const {
        bookingStatus,
        paymentStatus,
        page = 1,
        limit = 20,
        sort = '-createdAt',
    } = req.query;

    // Build query
    const query = {};
    if (bookingStatus) query.bookingStatus = bookingStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const bookings = await Booking.find(query)
        .populate('user', 'name email phone')
        .populate('package', 'name category price')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
        success: true,
        count: bookings.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: {
            bookings,
        },
    });
});

/**
 * @desc    Get user's bookings
 * @route   GET /api/v1/bookings/my
 * @access  Private
 */
const getMyBookings = catchAsync(async (req, res, next) => {
    const bookings = await Booking.find({ user: req.user.id })
        .populate('package', 'name category price duration')
        .sort('-createdAt');

    res.status(200).json({
        success: true,
        count: bookings.length,
        data: {
            bookings,
        },
    });
});

/**
 * @desc    Get single booking
 * @route   GET /api/v1/bookings/:id
 * @access  Private
 */
const getBookingById = catchAsync(async (req, res, next) => {
    const booking = await Booking.findById(req.params.id)
        .populate('user', 'name email phone')
        .populate('package');

    if (!booking) {
        return next(new AppError('Booking not found', 404));
    }

    // Check authorization (user can only view their own bookings, admin can view all)
    if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user.id) {
        return next(new AppError('You are not authorized to view this booking', 403));
    }

    res.status(200).json({
        success: true,
        data: {
            booking,
        },
    });
});

/**
 * @desc    Update booking status (Admin)
 * @route   PUT /api/v1/bookings/:id/status
 * @access  Private/Admin
 */
const updateBookingStatus = catchAsync(async (req, res, next) => {
    const { status, cancellationReason } = req.body;

    const booking = await Booking.findById(req.params.id).populate('user package');

    if (!booking) {
        return next(new AppError('Booking not found', 404));
    }

    // Update status
    booking.bookingStatus = status;

    if (status === 'Confirmed') {
        booking.confirmedAt = new Date();

        // Send confirmation email
        sendBookingConfirmationEmail(booking.user.email, {
            clientName: booking.contactInfo.name,
            packageName: booking.package.name,
            date: booking.bookingDate.toLocaleDateString(),
            time: booking.bookingTime,
            location: booking.location,
            price: booking.pricing.packagePrice,
            depositAmount: booking.pricing.depositAmount,
            remainingAmount: booking.pricing.remainingAmount,
        }).catch((err) => console.error('Failed to send confirmation email:', err));
    }

    if (status === 'Cancelled') {
        booking.cancelledAt = new Date();
        booking.cancellationReason = cancellationReason;

        // Send cancellation email
        sendBookingCancellationEmail(booking.user.email, {
            clientName: booking.contactInfo.name,
            date: booking.bookingDate.toLocaleDateString(),
            reason: cancellationReason,
        }).catch((err) => console.error('Failed to send cancellation email:', err));
    }

    if (status === 'Completed') {
        booking.completedAt = new Date();
    }

    await booking.save();

    res.status(200).json({
        success: true,
        message: `Booking ${status.toLowerCase()} successfully`,
        data: {
            booking,
        },
    });
});

/**
 * @desc    Cancel booking (User)
 * @route   DELETE /api/v1/bookings/:id
 * @access  Private
 */
const cancelBooking = catchAsync(async (req, res, next) => {
    const booking = await Booking.findById(req.params.id).populate('user');

    if (!booking) {
        return next(new AppError('Booking not found', 404));
    }

    // Check authorization
    if (req.user.role !== 'admin' && booking.user._id.toString() !== req.user.id) {
        return next(new AppError('You are not authorized to cancel this booking', 403));
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
        return next(
            new AppError('This booking cannot be cancelled. It is either completed, already cancelled, or the date has passed.', 400)
        );
    }

    booking.bookingStatus = 'Cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || 'Cancelled by user';
    await booking.save();

    res.status(200).json({
        success: true,
        message: 'Booking cancelled successfully',
        data: {
            booking,
        },
    });
});

/**
 * @desc    Get booking statistics (Admin)
 * @route   GET /api/v1/bookings/stats/overview
 * @access  Private/Admin
 */
const getBookingStats = catchAsync(async (req, res, next) => {
    const stats = await Booking.aggregate([
        {
            $group: {
                _id: '$bookingStatus',
                count: { $sum: 1 },
                totalRevenue: { $sum: '$pricing.totalPaid' },
            },
        },
    ]);

    const totalBookings = await Booking.countDocuments();
    const pendingPayments = await Booking.countDocuments({ paymentStatus: 'Pending' });
    const upcomingBookings = await Booking.countDocuments({
        bookingDate: { $gte: new Date() },
        bookingStatus: { $in: ['Confirmed', 'Pending'] },
    });

    res.status(200).json({
        success: true,
        data: {
            stats,
            totalBookings,
            pendingPayments,
            upcomingBookings,
        },
    });
});

module.exports = {
    createBooking,
    getAllBookings,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
    cancelBooking,
    getBookingStats,
};
