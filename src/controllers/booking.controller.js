const Booking = require("../models/Booking");
const Package = require("../models/Package");
const User = require("../models/User");
const { AppError, catchAsync } = require("../utils/errorHandler");
const {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
} = require("../services/email.service");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

/**
 * @desc    Create new booking
 * @route   POST /api/v1/bookings
 * @access  Private
 */
const createBooking = catchAsync(async (req, res, next) => {
  const { packageId, bookingDate, bookingTime, location, notes, contactInfo } =
    req.body;

  // Get package details
  const pkg = await Package.findByPk(packageId);
  if (!pkg) {
    return next(new AppError("Package not found", 404));
  }

  if (!pkg.isActive) {
    return next(new AppError("This package is not available", 400));
  }

  // Check if date is available (check max bookings per day)
  const bookingsOnDate = await Booking.count({
    where: {
      packageId: packageId,
      bookingDate: new Date(bookingDate),
      bookingStatus: { [Op.notIn]: ["Cancelled"] },
    },
  });

  if (bookingsOnDate >= pkg.maxBookingsPerDay) {
    return next(
      new AppError(
        "This date is fully booked. Please choose another date.",
        400
      )
    );
  }

  // Calculate pricing
  const depositAmount = (pkg.price * pkg.depositPercentage) / 100;
  const remainingAmount = pkg.price - depositAmount;

  // Create booking
  const booking = await Booking.create({
    userId: req.user.id,
    packageId: packageId,
    bookingDate,
    bookingTime,
    location,
    notes,
    contactInfo,
    pricing: {
      packagePrice: pkg.price,
      depositAmount,
      remainingAmount,
      totalPaid: 0,
    },
    paymentStatus: "Pending",
    bookingStatus: "Pending",
  });

  // Fetch booking with package details
  const bookingWithDetails = await Booking.findByPk(booking.id, {
    include: [{ model: Package, as: "package" }],
  });

  res.status(201).json({
    success: true,
    message: "Booking created successfully. Please proceed with payment.",
    data: {
      booking: bookingWithDetails,
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
    sort = "createdAt",
    order = "DESC",
  } = req.query;

  const where = {};
  if (bookingStatus) where.bookingStatus = bookingStatus;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const offset = (page - 1) * limit;

  // ເພີ່ມ logging ເພື່ອ debug
  console.log("Fetching bookings with includes...");

  const { count: total, rows: bookings } = await Booking.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "user", // ຕ້ອງກົງກັບທີ່ກຳນົດໃນ index.js
        attributes: ["id", "name", "email", "phone"],
        required: false, // LEFT JOIN - ຈະສະແດງ booking ເຖິງແມ່ນບໍ່ມີ user
      },
      {
        model: Package,
        as: "package", // ຕ້ອງກົງກັບທີ່ກຳນົດໃນ index.js
        attributes: ["id", "name", "category", "price"],
        required: false, // LEFT JOIN
      },
    ],
    order: [[sort, order]],
    offset: parseInt(offset),
    limit: parseInt(limit),
    distinct: true, // ສຳຄັນສຳລັບການນັບທີ່ຖືກຕ້ອງ
    // logging: console.log  // ເປີດເພື່ອເບິ່ງ SQL query
  });

  // Debug: ກວດເບິ່ງຂໍ້ມູນທີ່ໄດ້

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
  const bookings = await Booking.findAll({
    where: { userId: req.user.id },
    include: [
      {
        model: Package,
        as: "package",
        attributes: ["name", "category", "price", "duration"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

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
  const booking = await Booking.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["name", "email", "phone"],
      },
      { model: Package, as: "package" },
    ],
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  // Check authorization (user can only view their own bookings, admin can view all)
  if (req.user.role !== "admin" && booking.userId !== req.user.id) {
    return next(
      new AppError("You are not authorized to view this booking", 403)
    );
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

  const booking = await Booking.findByPk(req.params.id, {
    include: [
      { model: User, as: "user" },
      { model: Package, as: "package" },
    ],
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  // Update status
  booking.bookingStatus = status;

  if (status === "Confirmed") {
    booking.confirmedAt = new Date();

    // Send confirmation email
    sendBookingConfirmationEmail(booking.user.email, {
      clientName: booking.contactInfo.name,
      packageName: booking.package.name,
      date: new Date(booking.bookingDate).toLocaleDateString(),
      time: booking.bookingTime,
      location: booking.location,
      price: booking.pricing.packagePrice,
      depositAmount: booking.pricing.depositAmount,
      remainingAmount: booking.pricing.remainingAmount,
    }).catch((err) => console.error("Failed to send confirmation email:", err));
  }

  if (status === "Cancelled") {
    booking.cancelledAt = new Date();
    booking.cancellationReason = cancellationReason;

    // Send cancellation email
    sendBookingCancellationEmail(booking.user.email, {
      clientName: booking.contactInfo.name,
      date: new Date(booking.bookingDate).toLocaleDateString(),
      reason: cancellationReason,
    }).catch((err) => console.error("Failed to send cancellation email:", err));
  }

  if (status === "Completed") {
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
  const booking = await Booking.findByPk(req.params.id, {
    include: [{ model: User, as: "user" }],
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  // Check authorization
  if (req.user.role !== "admin" && booking.userId !== req.user.id) {
    return next(
      new AppError("You are not authorized to cancel this booking", 403)
    );
  }

  // Check if booking can be cancelled
  if (!booking.canBeCancelled()) {
    return next(
      new AppError(
        "This booking cannot be cancelled. It is either completed, already cancelled, or the date has passed.",
        400
      )
    );
  }

  booking.bookingStatus = "Cancelled";
  booking.cancelledAt = new Date();
  booking.cancellationReason = req.body.reason || "Cancelled by user";
  await booking.save();

  res.status(200).json({
    success: true,
    message: "Booking cancelled successfully",
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
  const stats = await Booking.findAll({
    attributes: [
      "bookingStatus",
      [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      // Note: Extracting totalRevenue from JSON field 'pricing' is tricky in standard SQL/Sequelize
      // For now, we'll just count bookings by status
    ],
    group: ["bookingStatus"],
  });

  const totalBookings = await Booking.count();
  const pendingPayments = await Booking.count({
    where: { paymentStatus: "Pending" },
  });
  const upcomingBookings = await Booking.count({
    where: {
      bookingDate: { [Op.gte]: new Date() },
      bookingStatus: { [Op.in]: ["Confirmed", "Pending"] },
    },
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

/**
 * @desc    Upload photos for a booking
 * @route   POST /api/v1/bookings/:id/photos
 * @access  Private (Admin only)
 */
const uploadBookingPhotos = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find booking
  const booking = await Booking.findByPk(id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"],
      },
      {
        model: Package,
        as: "package",
        attributes: ["id", "name"],
      },
    ],
  });

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  // Check if files were uploaded
  if (!req.files || req.files.length === 0) {
    return next(new AppError("Please upload at least one photo", 400));
  }

  // Process uploaded files (URLs will be set by Cloudinary middleware)
  const uploadedFiles = req.files.map((file) => ({
    url: file.path,
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
  }));

  // Update booking with photo information
  const photoUrls = uploadedFiles.map((file) => file.url);

  await booking.update({
    photosUploaded: true,
    photoUrls: photoUrls,
    photosUploadedAt: new Date(),
  });

  // TODO: Send notification email to client about photo availability

  res.status(200).json({
    success: true,
    message: `Successfully uploaded ${uploadedFiles.length} photos for booking`,
    data: {
      booking,
      uploadedFiles: uploadedFiles.map((file) => ({
        url: file.url,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
      })),
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
  uploadBookingPhotos,
};
