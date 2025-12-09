const { DataTypes, INTEGER } = require("sequelize");
const sequelize = require("../config/database");

const Package = sequelize.define(
  "Package",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Package name is required" },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        notEmpty: { msg: "Description is required" },
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: { args: [0], msg: "Price cannot be negative" },
        notNull: { msg: "Price is required" },
      },
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: { args: [1], msg: "Duration must be at least 1 hour" },
      },
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    deliverables: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        editedPhotos: 0,
        rawPhotos: 0,
        printRights: false,
        onlineGallery: true,
      },
    },
    category: {
      type: DataTypes.ENUM("Wedding", "Portrait", "Studio", "Event", "Product"),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    photosIncluded: {
      // ✅ Add this field (you're using it in frontend)
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    popular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    maxBookingsPerDay: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    depositPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: {
        min: 0,
        max: 100,
      },
    },
  },
  {
    tableName: "packages",
    timestamps: true,
  }
);

// Virtual fields
Package.prototype.getDepositAmount = function () {
  return (parseFloat(this.price) * this.depositPercentage) / 100;
};

Package.prototype.getRemainingAmount = function () {
  return parseFloat(this.price) - this.getDepositAmount();
};

module.exports = Package;
