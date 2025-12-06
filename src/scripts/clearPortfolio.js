require('dotenv').config();
const { Portfolio, sequelize } = require('../models');

async function clearPortfolio() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully.');

        const deletedCount = await Portfolio.destroy({
            where: {},
            truncate: true
        });

        console.log(`✅ Successfully deleted ${deletedCount} portfolio items from database.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing portfolio:', error);
        process.exit(1);
    }
}

clearPortfolio();
