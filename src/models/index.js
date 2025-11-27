const sequelize = require('../config/database');
const User = require('./User');
const Package = require('./Package');
const Booking = require('./Booking');
const Payment = require('./Payment');
const Portfolio = require('./Portfolio');
const Delivery = require('./Delivery');

// Define relationships
User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Package.hasMany(Booking, { foreignKey: 'packageId', as: 'bookings' });
Booking.belongsTo(Package, { foreignKey: 'packageId', as: 'package' });

User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Booking.hasMany(Payment, { foreignKey: 'bookingId', as: 'payments' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

Booking.hasOne(Delivery, { foreignKey: 'bookingId', as: 'delivery' });
Delivery.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

module.exports = {
    sequelize,
    User,
    Package,
    Booking,
    Payment,
    Portfolio,
    Delivery,
};
