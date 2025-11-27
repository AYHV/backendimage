require('dotenv').config();
const { sequelize } = require('../models');

async function syncDatabase() {
    try {
        console.log('🔄 Starting database synchronization...');
        
        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Force sync (WARNING: This will drop all tables and recreate them)
        // Use { force: true } only in development when you want to reset everything
        // Use { alter: true } to update tables without losing data
        await sequelize.sync({ force: false, alter: true });
        
        console.log('✅ All models were synchronized successfully');
        console.log('📋 Tables created:');
        console.log('   - users');
        console.log('   - packages');
        console.log('   - bookings');
        console.log('   - payments');
        console.log('   - portfolios');
        console.log('   - deliveries');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error synchronizing database:', error);
        process.exit(1);
    }
}

syncDatabase();
