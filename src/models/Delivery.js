const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Delivery = sequelize.define('Delivery', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    bookingId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'bookings',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    albumName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Album name is required' },
        },
    },
    description: {
        type: DataTypes.STRING(1000),
        allowNull: true,
    },
    photos: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    downloadUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    allowDownload: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    watermarkEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    downloads: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    notifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'deliveries',
    timestamps: true,
    indexes: [
        { fields: ['bookingId'] },
        { fields: ['createdAt'] },
    ],
});

// Instance methods
Delivery.prototype.getPhotoCount = function () {
    return this.photos ? this.photos.length : 0;
};

Delivery.prototype.isExpired = function () {
    if (!this.expiresAt) return false;
    return this.expiresAt < new Date();
};

module.exports = Delivery;
