const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { AppError, catchAsync } = require('../utils/errorHandler');
const stripeService = require('../services/stripe.service');
const { sendPaymentReceiptEmail } = require('../services/email.service');

/**
 * @desc    Create deposit payment intent
 * @route   POST /api/v1/payments/deposit
 * @access  Private
 */
const createDepositPayment = catchAsync(async (req, res, next) => {
    const { bookingId } = req.body;

    // Get booking
    const booking = await Booking.findById(bookingId).populate('user package');

    if (!booking) {
        return next(new AppError('Booking not found', 404));
    }

    // Check authorization
    if (booking.user._id.toString() !== req.user.id) {
        return next(new AppError('You are not authorized to make payment for this booking', 403));
    }

    // Check if deposit already paid
    if (booking.paymentStatus !== 'Pending') {
        return next(new AppError('Deposit has already been paid', 400));
    }

    // Create payment intent
    const { clientSecret, paymentIntentId } = await stripeService.createDepositPaymentIntent(
        booking.pricing.depositAmount,
        'usd',
        {
            bookingId: booking._id.toString(),
            userId: req.user.id,
            type: 'Deposit',
        }
    );

    // Create payment record
    const payment = await Payment.create({
        booking: booking._id,
        user: req.user.id,
        amount: booking.pricing.depositAmount,
        currency: 'USD',
        paymentType: 'Deposit',
        status: 'Pending',
        stripePaymentIntentId: paymentIntentId,
    });

    // Update booking
    booking.stripeDepositIntentId = paymentIntentId;
    await booking.save();

    res.status(200).json({
        success: true,
        message: 'Payment intent created successfully',
        data: {
            clientSecret,
            paymentIntentId,
            amount: booking.pricing.depositAmount,
            payment,
        },
    });
});

/**
 * @desc    Create remaining payment intent
 * @route   POST /api/v1/payments/confirm
 * @access  Private
 */
const createRemainingPayment = catchAsync(async (req, res, next) => {
    const { bookingId } = req.body;

    // Get booking
    const booking = await Booking.findById(bookingId).populate('user package');

    if (!booking) {
        return next(new AppError('Booking not found', 404));
    }

    // Check authorization
    if (booking.user._id.toString() !== req.user.id) {
        return next(new AppError('You are not authorized to make payment for this booking', 403));
    }

    // Check if deposit is paid
    if (booking.paymentStatus !== 'DepositPaid') {
        return next(new AppError('Deposit must be paid before paying the remaining amount', 400));
    }

    // Calculate remaining amount
    const remainingAmount = booking.pricing.remainingAmount;

    // Create payment intent
    const { clientSecret, paymentIntentId } = await stripeService.createFullPaymentIntent(
        remainingAmount,
        'usd',
        {
            bookingId: booking._id.toString(),
            userId: req.user.id,
            type: 'Remaining',
        }
    );

    // Create payment record
    const payment = await Payment.create({
        booking: booking._id,
        user: req.user.id,
        amount: remainingAmount,
        currency: 'USD',
        paymentType: 'Remaining',
        status: 'Pending',
        stripePaymentIntentId: paymentIntentId,
    });

    // Update booking
    booking.stripePaymentIntentId = paymentIntentId;
    await booking.save();

    res.status(200).json({
        success: true,
        message: 'Payment intent created successfully',
        data: {
            clientSecret,
            paymentIntentId,
            amount: remainingAmount,
            payment,
        },
    });
});

/**
 * @desc    Get payment history
 * @route   GET /api/v1/payments/history
 * @access  Private
 */
const getPaymentHistory = catchAsync(async (req, res, next) => {
    const query = req.user.role === 'admin' ? {} : { user: req.user.id };

    const payments = await Payment.find(query)
        .populate('booking', 'bookingDate bookingTime')
        .populate('user', 'name email')
        .sort('-createdAt');

    res.status(200).json({
        success: true,
        count: payments.length,
        data: {
            payments,
        },
    });
});

/**
 * @desc    Stripe webhook handler
 * @route   POST /api/v1/payments/webhook
 * @access  Public (Stripe)
 */
const handleStripeWebhook = catchAsync(async (req, res, next) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripeService.constructWebhookEvent(req.body, sig);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSuccess(event.data.object);
            break;

        case 'payment_intent.payment_failed':
            await handlePaymentFailure(event.data.object);
            break;

        case 'charge.refunded':
            await handleRefund(event.data.object);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
});

/**
 * Handle successful payment
 */
const handlePaymentSuccess = async (paymentIntent) => {
    const payment = await Payment.findOne({
        stripePaymentIntentId: paymentIntent.id,
    }).populate('booking user');

    if (!payment) {
        console.error('Payment not found for intent:', paymentIntent.id);
        return;
    }

    // Update payment status
    payment.status = 'Succeeded';
    payment.stripeChargeId = paymentIntent.latest_charge;
    await payment.save();

    // Update booking
    const booking = payment.booking;
    booking.pricing.totalPaid += payment.amount;

    if (payment.paymentType === 'Deposit') {
        booking.paymentStatus = 'DepositPaid';
        booking.bookingStatus = 'Confirmed';
        booking.confirmedAt = new Date();
    } else if (payment.paymentType === 'Remaining' || payment.paymentType === 'Full') {
        booking.paymentStatus = 'FullyPaid';
    }

    await booking.save();

    // Send receipt email
    sendPaymentReceiptEmail(payment.user.email, {
        clientName: payment.user.name,
        amount: payment.amount,
        type: payment.paymentType,
        date: new Date().toLocaleDateString(),
        transactionId: paymentIntent.id,
    }).catch((err) => console.error('Failed to send receipt email:', err));
};

/**
 * Handle failed payment
 */
const handlePaymentFailure = async (paymentIntent) => {
    const payment = await Payment.findOne({
        stripePaymentIntentId: paymentIntent.id,
    });

    if (!payment) {
        console.error('Payment not found for intent:', paymentIntent.id);
        return;
    }

    payment.status = 'Failed';
    payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    await payment.save();
};

/**
 * Handle refund
 */
const handleRefund = async (charge) => {
    const payment = await Payment.findOne({
        stripeChargeId: charge.id,
    }).populate('booking');

    if (!payment) {
        console.error('Payment not found for charge:', charge.id);
        return;
    }

    payment.status = 'Refunded';
    payment.refundedAmount = charge.amount_refunded / 100;
    payment.refundedAt = new Date();
    await payment.save();

    // Update booking
    const booking = payment.booking;
    booking.pricing.totalPaid -= payment.refundedAmount;
    booking.paymentStatus = 'Refunded';
    await booking.save();
};

/**
 * @desc    Create refund (Admin)
 * @route   POST /api/v1/payments/:id/refund
 * @access  Private/Admin
 */
const createRefund = catchAsync(async (req, res, next) => {
    const { amount } = req.body;

    const payment = await Payment.findById(req.params.id).populate('booking');

    if (!payment) {
        return next(new AppError('Payment not found', 404));
    }

    if (payment.status !== 'Succeeded') {
        return next(new AppError('Only successful payments can be refunded', 400));
    }

    // Create refund in Stripe
    const refund = await stripeService.createRefund(
        payment.stripePaymentIntentId,
        amount
    );

    payment.status = 'Refunded';
    payment.refundedAmount = amount || payment.amount;
    payment.refundedAt = new Date();
    payment.stripeRefundId = refund.id;
    await payment.save();

    // Update booking
    const booking = payment.booking;
    booking.pricing.totalPaid -= payment.refundedAmount;
    if (booking.pricing.totalPaid === 0) {
        booking.paymentStatus = 'Refunded';
    }
    await booking.save();

    res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: {
            payment,
            refund,
        },
    });
});

module.exports = {
    createDepositPayment,
    createRemainingPayment,
    getPaymentHistory,
    handleStripeWebhook,
    createRefund,
};
