require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
    }
);

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL connection successful!');
        console.log('📊 Connection details:');
        console.log(`   Host: ${process.env.DB_HOST}`);
        console.log(`   Port: ${process.env.DB_PORT}`);
        console.log(`   Database: ${process.env.DB_NAME}`);
        console.log(`   User: ${process.env.DB_USER}`);
        
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Unable to connect to MySQL database:');
        console.error(`   Error: ${error.message}`);
        console.error('\n💡 Check:');
        console.error('   1. MySQL server is running');
        console.error('   2. Database exists (or will be created)');
        console.error('   3. Username and password are correct');
        console.error('   4. Host and port are correct');
        process.exit(1);
    }
}

testConnection();
