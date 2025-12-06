const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Package = require('../models/Package');
const { catchAsync, AppError } = require('../utils/errorHandler');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/v1/admin/dashboard
 * @access  Private/Admin
 */
const getDashboardStats = catchAsync(async (req, res, next) => {
    // Total bookings
    const totalBookings = await Booking.count();

    // Bookings by status
    const bookingsByStatus = await Booking.findAll({
        attributes: [
            'bookingStatus',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['bookingStatus'],
        raw: true
    });

    // Total revenue
    const revenueStats = await Payment.findAll({
        attributes: [
            [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalPayments'],
        ],
        where: { status: 'Succeeded' },
        raw: true
    });

    // Calculate deposits separately because conditional aggregation is complex in Sequelize
    const depositStats = await Payment.sum('amount', {
        where: {
            status: 'Succeeded',
            paymentType: 'Deposit'
        }
    });

    const revenue = {
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        totalDeposits: depositStats || 0,
        totalPayments: revenueStats[0]?.totalPayments || 0,
    };

    // Pending payments
    const pendingPayments = await Booking.count({
        where: {
            paymentStatus: { [Op.in]: ['Pending', 'DepositPaid'] },
        }
    });

    // Upcoming bookings
    const upcomingBookings = await Booking.count({
        where: {
            bookingDate: { [Op.gte]: new Date() },
            bookingStatus: { [Op.in]: ['Confirmed', 'Pending'] },
        }
    });

    // Total clients
    const totalClients = await User.count({ where: { role: 'client' } });

    // Recent bookings
    const recentBookings = await Booking.findAll({
        include: [
            { model: User, as: 'user', attributes: ['name', 'email'] },
            { model: Package, as: 'package', attributes: ['name', 'category'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 10
    });

    // Monthly revenue (last 12 months)
    // Using raw query for date manipulation compatibility across DBs
    const monthlyRevenue = await sequelize.query(`
        SELECT 
            YEAR(created_at) as year,
            MONTH(created_at) as month,
            SUM(amount) as revenue,
            COUNT(*) as count
        FROM payments
        WHERE status = 'Succeeded' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY year ASC, month ASC
    `, { type: sequelize.QueryTypes.SELECT });

    // Popular packages
    const popularPackages = await Booking.findAll({
        attributes: [
            'packageId',
            [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'bookingCount']
        ],
        include: [
            { model: Package, as: 'package', attributes: ['name', 'category', 'price'] }
        ],
        group: ['packageId', 'package.id', 'package.name', 'package.category', 'package.price'],
        order: [[sequelize.literal('bookingCount'), 'DESC']],
        limit: 5
    });

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
    const where = { role: 'client' };
    if (search) {
        where[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
        ];
    }

    // Execute query with pagination
    const offset = (page - 1) * limit;
    const { count: total, rows: clients } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password', 'refreshToken'] },
        order: [['createdAt', 'DESC']],
        offset,
        limit: parseInt(limit),
    });

    // Get booking count and total spent for each client
    const clientsWithStats = await Promise.all(
        clients.map(async (client) => {
            const bookingCount = await Booking.count({ where: { userId: client.id } });
            const totalSpent = await Payment.sum('amount', {
                where: {
                    userId: client.id,
                    status: 'Succeeded',
                }
            });

            return {
                ...client.toJSON(),
                bookingCount,
                totalSpent: totalSpent || 0,
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
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    const where = { status: 'Succeeded' };
    if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
    }

    // Total revenue
    const totalRevenueStats = await Payment.findAll({
        where,
        attributes: [
            [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('AVG', sequelize.col('amount')), 'avgTransaction'],
        ],
        raw: true
    });

    // Revenue by payment type
    const revenueByType = await Payment.findAll({
        where,
        attributes: [
            'paymentType',
            [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['paymentType'],
        raw: true
    });

    // Revenue by package category
    // This requires joining Payment -> Booking -> Package
    const revenueByCategory = await Payment.findAll({
        where,
        include: [{
            model: Booking,
            as: 'booking',
            attributes: [],
            include: [{
                model: Package,
                as: 'package',
                attributes: ['category']
            }]
        }],
        attributes: [
            [sequelize.col('booking.package.category'), 'category'],
            [sequelize.fn('SUM', sequelize.col('Payment.amount')), 'revenue'],
            [sequelize.fn('COUNT', sequelize.col('Payment.id')), 'bookings']
        ],
        group: ['booking.package.category'],
        order: [[sequelize.literal('revenue'), 'DESC']],
        raw: true
    });

    // Daily revenue (last 30 days)
    const dailyRevenue = await sequelize.query(`
        SELECT 
            YEAR(created_at) as year,
            MONTH(created_at) as month,
            DAY(created_at) as day,
            SUM(amount) as revenue,
            COUNT(*) as transactions
        FROM payments
        WHERE status = 'Succeeded'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY YEAR(created_at), MONTH(created_at), DAY(created_at)
        ORDER BY year ASC, month ASC, day ASC
    `, { type: sequelize.QueryTypes.SELECT });

    res.status(200).json({
        success: true,
        data: {
            totalRevenue: totalRevenueStats[0] || { total: 0, count: 0, avgTransaction: 0 },
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

    const user = await User.findByPk(req.params.id);

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    await user.update({ isActive });

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
