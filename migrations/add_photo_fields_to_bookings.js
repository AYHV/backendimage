const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new photo-related columns to Bookings table
    await queryInterface.addColumn('Bookings', 'photosUploaded', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });

    await queryInterface.addColumn('Bookings', 'photoUrls', {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of uploaded photo URLs',
    });

    await queryInterface.addColumn('Bookings', 'photosUploadedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns if rolling back
    await queryInterface.removeColumn('Bookings', 'photosUploaded');
    await queryInterface.removeColumn('Bookings', 'photoUrls');
    await queryInterface.removeColumn('Bookings', 'photosUploadedAt');
  },
};