const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Package = require('../models/Package');
const { catchAsync } = require('../utils/errorHandler');

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/v1/admin/dashboard
 * @access  Private/Admin
 */
const getDashboardStats = catchAsync(async (req, res, next) => {
    // Total bookings
    const totalBookings = await Booking.countDocuments();

    // Bookings by status
    const bookingsByStatus = await Booking.aggregate([
        {
            $group: {
                _id: '$bookingStatus',
                count: { $sum: 1 },
            },
        },
    ]);

    // Total revenue
    const revenueData = await Payment.aggregate([
        {
            $match: { status: 'Succeeded' },
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amount' },
                totalDeposits: {
                    $sum: {
                        $cond: [{ $eq: ['$paymentType', 'Deposit'] }, '$amount', 0],
                    },
                },
                totalPayments: { $sum: 1 },
            },
        },
    ]);

    const revenue = revenueData[0] || {
        totalRevenue: 0,
        totalDeposits: 0,
        totalPayments: 0,
    };

    // Pending payments
    const pendingPayments = await Booking.countDocuments({
        paymentStatus: { $in: ['Pending', 'DepositPaid'] },
    });

    // Upcoming bookings
    const upcomingBookings = await Booking.countDocuments({
        bookingDate: { $gte: new Date() },
        bookingStatus: { $in: ['Confirmed', 'Pending'] },
    });

    // Total clients
    const totalClients = await User.countDocuments({ role: 'client' });

    // Recent bookings
    const recentBookings = await Booking.find()
        .populate('user', 'name email')
        .populate('package', 'name category')
        .sort('-createdAt')
        .limit(10);

    // Monthly revenue (last 12 months)
    const monthlyRevenue = await Payment.aggregate([
        {
            $match: {
                status: 'Succeeded',
                createdAt: {
                    $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
                },
            },
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                },
                revenue: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 },
        },
    ]);

    // Popular packages
    const popularPackages = await Booking.aggregate([
        {
            $group: {
                _id: '$package',
                bookingCount: { $sum: 1 },
            },
        },
        {
            $sort: { bookingCount: -1 },
        },
        {
            $limit: 5,
        },
        {
            $lookup: {
                from: 'packages',
                localField: '_id',
                foreignField: '_id',
                as: 'packageDetails',
            },
        },
        {
            $unwind: '$packageDetails',
        },
    ]);

    res.status(200).json({
        success: true,
        data: {
            overview: {
                totalBookings,
                totalRevenue: revenue.totalRevenue,
                totalDeposits: revenue.totalDeposits,
                pendingPayments,
                upcomingBookings,
                totalClients,
            },
            bookingsByStatus,
            recentBookings,
            monthlyRevenue,
            popularPackages,
        },
    });
});

/**
 * @desc    Get all clients
 * @route   GET /api/v1/admin/clients
 * @access  Private/Admin
 */
const getAllClients = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20, search } = req.query;

    // Build query
    const query = { role: 'client' };
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const clients = await User.find(query)
        .select('-password -refreshToken')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Get booking count for each client
    const clientsWithStats = await Promise.all(
        clients.map(async (client) => {
            const bookingCount = await Booking.countDocuments({ user: client._id });
            const totalSpent = await Payment.aggregate([
                {
                    $match: {
                        user: client._id,
                        status: 'Succeeded',
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                    },
                },
            ]);

            return {
                ...client.toObject(),
                bookingCount,
                totalSpent: totalSpent[0]?.total || 0,
            };
        })
    );

    res.status(200).json({
        success: true,
        count: clients.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: {
            clients: clientsWithStats,
        },
    });
});

/**
 * @desc    Get revenue statistics
 * @route   GET /api/v1/admin/revenue
 * @access  Private/Admin
 */
const getRevenueStats = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = { status: 'Succeeded' };
    if (Object.keys(dateFilter).length > 0) {
        matchStage.createdAt = dateFilter;
    }

    // Total revenue
    const totalRevenue = await Payment.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' },
                count: { $sum: 1 },
                avgTransaction: { $avg: '$amount' },
            },
        },
    ]);

    // Revenue by payment type
    const revenueByType = await Payment.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$paymentType',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
    ]);

    // Revenue by package category
    const revenueByCategory = await Booking.aggregate([
        {
            $lookup: {
                from: 'payments',
                localField: '_id',
                foreignField: 'booking',
                as: 'payments',
            },
        },
        {
            $unwind: '$payments',
        },
        {
            $match: { 'payments.status': 'Succeeded' },
        },
        {
            $lookup: {
                from: 'packages',
                localField: 'package',
                foreignField: '_id',
                as: 'packageDetails',
            },
        },
        {
            $unwind: '$packageDetails',
        },
        {
            $group: {
                _id: '$packageDetails.category',
                revenue: { $sum: '$payments.amount' },
                bookings: { $sum: 1 },
            },
        },
        {
            $sort: { revenue: -1 },
        },
    ]);

    // Daily revenue (last 30 days)
    const dailyRevenue = await Payment.aggregate([
        {
            $match: {
                status: 'Succeeded',
                createdAt: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                },
            },
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                },
                revenue: { $sum: '$amount' },
                transactions: { $sum: 1 },
            },
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
        },
    ]);

    res.status(200).json({
        success: true,
        data: {
            totalRevenue: totalRevenue[0] || { total: 0, count: 0, avgTransaction: 0 },
            revenueByType,
            revenueByCategory,
            dailyRevenue,
        },
    });
});

/**
 * @desc    Update user status (activate/deactivate)
 * @route   PUT /api/v1/admin/clients/:id/status
 * @access  Private/Admin
 */
const updateClientStatus = catchAsync(async (req, res, next) => {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true, runValidators: true }
    );

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
            user,
        },
    });
});

module.exports = {
    getDashboardStats,
    getAllClients,
    getRevenueStats,
    updateClientStatus,
};
