require('dotenv').config();
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const Package = require('./src/models/Package');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seeding...');

        // Sync database
        await sequelize.sync({ force: false });
        console.log('✅ Database synced');

        // Check if admin user exists
        const existingAdmin = await User.findOne({ where: { email: 'admin@example.com' } });
        
        if (!existingAdmin) {
            // Create admin user
            const adminUser = await User.create({
                name: 'Admin User',
                email: 'admin@example.com',
                password: 'Admin123!@#',
                role: 'admin',
                isActive: true,
                emailVerified: true
            });
            console.log('✅ Admin user created:', adminUser.email);
        } else {
            console.log('ℹ️ Admin user already exists:', existingAdmin.email);
        }

        // Check if packages exist
        const existingPackages = await Package.count();
        
        if (existingPackages === 0) {
            // Create sample packages
            const packages = [
                {
                    name: 'Essential Portrait',
                    description: 'Perfect for individuals looking for professional headshots or personal branding.',
                    price: 299.00,
                    duration: { value: 1, unit: 'hours' },
                    category: 'Portrait',
                    features: [
                        { name: '1 Hour Session', included: true },
                        { name: '1 Location', included: true },
                        { name: '10 Edited Photos', included: true },
                        { name: 'Online Gallery', included: true },
                        { name: 'Print Rights', included: false },
                    ],
                    deliverables: {
                        editedPhotos: 10,
                        rawPhotos: 0,
                        printRights: false,
                        onlineGallery: true,
                    },
                    isActive: true
                },
                {
                    name: 'Premium Wedding',
                    description: 'Full day coverage for your special day with two photographers.',
                    price: 3500.00,
                    duration: { value: 10, unit: 'hours' },
                    category: 'Wedding',
                    features: [
                        { name: '10 Hours Coverage', included: true },
                        { name: '2 Photographers', included: true },
                        { name: '500+ Edited Photos', included: true },
                        { name: 'Engagement Session', included: true },
                        { name: 'Premium Photo Album', included: true },
                    ],
                    deliverables: {
                        editedPhotos: 500,
                        rawPhotos: 100,
                        printRights: true,
                        onlineGallery: true,
                    },
                    popular: true,
                    isActive: true
                },
                {
                    name: 'Studio Session',
                    description: 'Professional studio lighting setup for creative projects.',
                    price: 450.00,
                    duration: { value: 2, unit: 'hours' },
                    category: 'Studio',
                    features: [
                        { name: '2 Hour Studio Time', included: true },
                        { name: 'Professional Lighting', included: true },
                        { name: '20 Edited Photos', included: true },
                        { name: 'Multiple Outfits', included: true },
                    ],
                    deliverables: {
                        editedPhotos: 20,
                        rawPhotos: 0,
                        printRights: false,
                        onlineGallery: true,
                    },
                    isActive: true
                },
            ];

            await Package.bulkCreate(packages);
            console.log('✅ Sample packages created');
        } else {
            console.log('ℹ️ Packages already exist:', existingPackages, 'packages found');
        }

        console.log('🎉 Database seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
};

// Run the seeding
seedDatabase();