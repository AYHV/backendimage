const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    bookingId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'bookings',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: { args: [0], msg: 'Amount cannot be negative' },
            notNull: { msg: 'Amount is required' },
        },
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'USD',
        set(value) {
            this.setDataValue('currency', value.toUpperCase());
        },
    },
    paymentType: {
        type: DataTypes.ENUM('Deposit', 'Remaining', 'Full', 'Refund'),
        allowNull: false,
    },
    paymentMethod: {
        type: DataTypes.ENUM('card', 'bank_transfer', 'cash'),
        defaultValue: 'card',
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Processing', 'Succeeded', 'Failed', 'Cancelled', 'Refunded'),
        defaultValue: 'Pending',
    },
    stripePaymentIntentId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    stripeChargeId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    stripeRefundId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    failureReason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    receiptUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    refundedAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
    },
    refundedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'payments',
    timestamps: true,
    indexes: [
        { fields: ['bookingId'] },
        { fields: ['userId'] },
        { fields: ['status'] },
        { fields: ['stripePaymentIntentId'] },
    ],
});

module.exports = Payment;
