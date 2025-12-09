const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
    packageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'packages',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    bookingDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            notNull: { msg: 'Booking date is required' },
        },
    },
    bookingTime: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'Booking time is required' },
        },
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    notes: {
        type: DataTypes.STRING(1000),
        allowNull: true,
    },
    contactInfo: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    pricing: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    paymentStatus: {
        type: DataTypes.ENUM('Pending', 'DepositPaid', 'FullyPaid', 'Refunded'),
        defaultValue: 'Pending',
    },
    bookingStatus: {
        type: DataTypes.ENUM('Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled'),
        defaultValue: 'Pending',
    },
    stripePaymentIntentId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    stripeDepositIntentId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    photosUploaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    photoUrls: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of uploaded photo URLs',
    },
    photosUploadedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'bookings',
    timestamps: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['booking_date'] },
        { fields: ['booking_status'] },
        { fields: ['payment_status'] },
    ],
});

// Instance methods
Booking.prototype.isPast = function () {
    return this.bookingDate < new Date();
};

Booking.prototype.canBeCancelled = function () {
    return (
        this.bookingStatus !== 'Completed' &&
        this.bookingStatus !== 'Cancelled' &&
        !this.isPast()
    );
};

module.exports = Booking;
