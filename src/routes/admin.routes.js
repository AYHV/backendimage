const express = require('express');
const {
    getDashboardStats,
    getAllClients,
    getRevenueStats,
    updateClientStatus,
} = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/clients', getAllClients);
router.get('/revenue', getRevenueStats);
router.put('/clients/:id/status', updateClientStatus);

module.exports = router;
