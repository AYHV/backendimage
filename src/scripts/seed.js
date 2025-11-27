require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Package = require('../models/Package');
const Portfolio = require('../models/Portfolio');

// Connect to DB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('DB connection successful!'))
    .catch((err) => console.error('DB Connection Error:', err));

const seedData = async () => {
    try {
        // Clear existing data
        await User.deleteMany();
        await Package.deleteMany();
        await Portfolio.deleteMany();
        console.log('Data cleared!');

        // Create Admin User
        await User.create({
            name: process.env.ADMIN_NAME || 'Admin User',
            email: process.env.ADMIN_EMAIL || 'admin@photographerportfolio.com',
            password: process.env.ADMIN_PASSWORD || 'Admin@123456',
            role: 'admin',
            isActive: true,
        });
        console.log('Admin user created!');

        // Create Packages
        const packages = [
            {
                name: 'Essential Portrait',
                description: 'Perfect for individuals looking for professional headshots or personal branding.',
                price: 299,
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
                    onlineGallery: true,
                },
            },
            {
                name: 'Premium Wedding',
                description: 'Full day coverage for your special day with two photographers.',
                price: 3500,
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
                    printRights: true,
                    onlineGallery: true,
                },
                popular: true,
            },
            {
                name: 'Studio Session',
                description: 'Professional studio lighting setup for creative projects.',
                price: 450,
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
                    onlineGallery: true,
                },
            },
        ];

        await Package.create(packages);
        console.log('Packages created!');

        console.log('Seeding completed successfully!');
        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
