// scripts/seedPackages.js
// Run this with: node scripts/seedPackages.js

const sequelize = require('../config/database');
const Package = require('../models/Package');

const packagesToSeed = [
    {
        name: 'Basic',
        price: 499,
        description: 'Perfect for small events',
        duration: 2,
        photosIncluded: 50,
        category: 'Event',
        features: [
            '2 hours of photography coverage',
            '50 edited high-resolution images',
            'Online gallery for 6 months',
            'Commercial usage rights',
            'Second photographer'
        ],
        isActive: true,
        popular: false,
    },
    {
        name: 'Plus',
        price: 999,
        description: 'Most popular choice',
        duration: 6,
        photosIncluded: 200,
        category: 'Wedding',
        features: [
            '6 hours of photography coverage',
            '200 edited high-resolution images',
            'Online gallery for 1 year',
            'Commercial usage rights',
            'Second photographer included',
            'Drone photography'
        ],
        isActive: true,
        popular: true,
    },
    {
        name: 'Premium',
        price: 1999,
        description: 'Ultimate experience',
        duration: 12,
        photosIncluded: 500,
        category: 'Wedding',
        features: [
            'Full day coverage (12 hours)',
            '500+ edited high-resolution images',
            'Lifetime online gallery access',
            'Full commercial usage rights',
            'Two professional photographers',
            'Premium album + Drone photography'
        ],
        isActive: true,
        popular: false,
    },
];

async function seedPackages() {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        // Sync models (create tables if they don't exist)
        await sequelize.sync();
        console.log('✅ Models synced');

        // Optional: Clear existing packages (comment this out if you want to keep existing data)
        // await Package.destroy({ where: {}, truncate: true });
        // console.log('🗑️  Existing packages cleared');

        // Insert packages
        for (const pkg of packagesToSeed) {
            // Check if package already exists
            const existing = await Package.findOne({ where: { name: pkg.name } });
            
            if (existing) {
                console.log(`⚠️  Package "${pkg.name}" already exists, skipping...`);
                continue;
            }

            await Package.create(pkg);
            console.log(`✅ Created package: ${pkg.name} - $${pkg.price}`);
        }

        console.log('\n🎉 All packages seeded successfully!');
        
        // Display summary
        const count = await Package.count();
        console.log(`📦 Total packages in database: ${count}`);

    } catch (error) {
        console.error('❌ Error seeding packages:', error);
    } finally {
        // Close database connection
        await sequelize.close();
        console.log('👋 Database connection closed');
    }
}

// Run the seed function
seedPackages();