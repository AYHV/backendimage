const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Portfolio = sequelize.define('Portfolio', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Title is required' },
            len: { args: [1, 200], msg: 'Title cannot exceed 200 characters' },
        },
    },
    description: {
        type: DataTypes.STRING(2000),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Description is required' },
            len: { args: [1, 2000], msg: 'Description cannot exceed 2000 characters' },
        },
    },
    category: {
        type: DataTypes.ENUM('Wedding', 'Portrait', 'Studio', 'Event', 'Product'),
        allowNull: false,
        validate: {
            notNull: { msg: 'Category is required' },
        },
    },
    images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    coverImage: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    shootDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    client: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    likes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'portfolios',
    timestamps: true,
    indexes: [
        { fields: ['category', 'isPublished'] },
        { fields: ['featured'] },
        { fields: ['createdAt'] },
    ],
});

// Virtual for image count
Portfolio.prototype.getImageCount = function () {
    return this.images ? this.images.length : 0;
};

module.exports = Portfolio;
