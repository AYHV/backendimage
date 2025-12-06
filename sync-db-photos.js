const sequelize = require('./src/config/database');
const Booking = require('./src/models/Booking');
const User = require('./src/models/User');
const Package = require('./src/models/Package');
const Portfolio = require('./src/models/Portfolio');
const Payment = require('./src/models/Payment');
const Delivery = require('./src/models/Delivery');

const syncDatabase = async () => {
    try {
        console.log('🔄 Starting database synchronization...');

        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');

        // Sync all models with alter option to add new fields
        await sequelize.sync({ alter: true });
        console.log('✅ Database synchronized successfully with new fields.');

        // Verify the new fields exist in Bookings table
        const [results] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Bookings' 
            AND COLUMN_NAME IN ('photosUploaded', 'photoUrls', 'photosUploadedAt')
        `);
        
        console.log('📋 New photo fields in Bookings table:');
        results.forEach(row => {
            console.log(`   - ${row.COLUMN_NAME}`);
        });

        console.log('🎉 Database sync completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database sync failed:', error);
        process.exit(1);
    }
};

// Run the sync
syncDatabase();