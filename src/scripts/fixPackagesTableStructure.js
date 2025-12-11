require('dotenv').config();
const { sequelize } = require('../models');

async function fixPackagesTable() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');
        
        // Step 1: Add a temporary column
        console.log('\n📝 Step 1: Adding temporary column...');
        await sequelize.query(`
            ALTER TABLE packages ADD COLUMN duration_temp INT DEFAULT 1
        `).catch(() => console.log('   Temp column already exists'));
        
        // Step 2: Extract integer values from JSON duration
        console.log('\n📝 Step 2: Extracting duration values from JSON...');
        const [packages] = await sequelize.query('SELECT id, duration FROM packages');
        
        for (const pkg of packages) {
            let value = 1;
            if (pkg.duration && typeof pkg.duration === 'object') {
                value = pkg.duration.value || pkg.duration.hours || 1;
            }
            await sequelize.query(
                'UPDATE packages SET duration_temp = ? WHERE id = ?',
                { replacements: [value, pkg.id] }
            );
            console.log(`   ✓ Package ${pkg.id}: ${value} hours`);
        }
        
        // Step 3: Drop old duration column
        console.log('\n📝 Step 3: Removing old duration column...');
        await sequelize.query('ALTER TABLE packages DROP COLUMN duration');
        
        // Step 4: Rename temp column to duration
        console.log('\n📝 Step 4: Renaming temp column...');
        await sequelize.query('ALTER TABLE packages CHANGE duration_temp duration INT NOT NULL DEFAULT 1');
        
        // Step 5: Add photos_included if it doesn't exist
        console.log('\n📝 Step 5: Adding photos_included column...');
        await sequelize.query(`
            ALTER TABLE packages ADD COLUMN photos_included INT DEFAULT 0
        `).catch(() => console.log('   Column already exists'));
        
        console.log('\n✅ All done! Packages table is now fixed.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

fixPackagesTable();
