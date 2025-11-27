const express = require('express');
const {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
} = require('../controllers/package.controller');
const { protect, restrictTo } = require('../middleware/auth');
const {
    validate,
    createPackageSchema,
    updatePackageSchema,
} = require('../middleware/validation');

const router = express.Router();

router
    .route('/')
    .get(getAllPackages)
    .post(
        protect,
        restrictTo('admin'),
        validate(createPackageSchema),
        createPackage
    );

router
    .route('/:id')
    .get(getPackageById)
    .put(
        protect,
        restrictTo('admin'),
        validate(updatePackageSchema),
        updatePackage
    )
    .delete(protect, restrictTo('admin'), deletePackage);

module.exports = router;
