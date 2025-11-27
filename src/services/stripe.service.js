const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { AppError } = require('../utils/errorHandler');

/**
 * Create payment intent for deposit
 */
const createDepositPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        };
    } catch (error) {
        throw new AppError('Failed to create payment intent', 500);
    }
};

/**
 * Create payment intent for full payment
 */
const createFullPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        };
    } catch (error) {
        throw new AppError('Failed to create payment intent', 500);
    }
};

/**
 * Retrieve payment intent
 */
const retrievePaymentIntent = async (paymentIntentId) => {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return paymentIntent;
    } catch (error) {
        throw new AppError('Failed to retrieve payment intent', 500);
    }
};

/**
 * Confirm payment intent
 */
const confirmPaymentIntent = async (paymentIntentId) => {
    try {
        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
        return paymentIntent;
    } catch (error) {
        throw new AppError('Failed to confirm payment', 500);
    }
};

/**
 * Cancel payment intent
 */
const cancelPaymentIntent = async (paymentIntentId) => {
    try {
        const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
        return paymentIntent;
    } catch (error) {
        throw new AppError('Failed to cancel payment', 500);
    }
};

/**
 * Create refund
 */
const createRefund = async (paymentIntentId, amount = null) => {
    try {
        const refundData = { payment_intent: paymentIntentId };
        if (amount) {
            refundData.amount = Math.round(amount * 100);
        }

        const refund = await stripe.refunds.create(refundData);
        return refund;
    } catch (error) {
        throw new AppError('Failed to create refund', 500);
    }
};

/**
 * Construct webhook event
 */
const constructWebhookEvent = (payload, signature) => {
    try {
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        return event;
    } catch (error) {
        throw new AppError('Webhook signature verification failed', 400);
    }
};

/**
 * Create customer
 */
const createCustomer = async (email, name, metadata = {}) => {
    try {
        const customer = await stripe.customers.create({
            email,
            name,
            metadata,
        });
        return customer;
    } catch (error) {
        throw new AppError('Failed to create customer', 500);
    }
};

/**
 * Get payment methods
 */
const getPaymentMethods = async (customerId) => {
    try {
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });
        return paymentMethods.data;
    } catch (error) {
        throw new AppError('Failed to retrieve payment methods', 500);
    }
};

module.exports = {
    createDepositPaymentIntent,
    createFullPaymentIntent,
    retrievePaymentIntent,
    confirmPaymentIntent,
    cancelPaymentIntent,
    createRefund,
    constructWebhookEvent,
    createCustomer,
    getPaymentMethods,
};
