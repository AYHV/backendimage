const express = require('express');
const {
    getAllPortfolio,
    getPortfolioById,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    deletePortfolioImage,
} = require('../controllers/portfolio.controller');
const { protect, restrictTo } = require('../middleware/auth');
const {
    validate,
    createPortfolioSchema,
    updatePortfolioSchema,
} = require('../middleware/validation');
const { uploadMultiple } = require('../middleware/upload');

const router = express.Router();

router
    .route('/')
    .get(getAllPortfolio)
    .post(
        protect,
        restrictTo('admin'),
        uploadMultiple('images'),
        validate(createPortfolioSchema),
        createPortfolio
    );

router
    .route('/:id')
    .get(getPortfolioById)
    .put(
        protect,
        restrictTo('admin'),
        uploadMultiple('images'),
        validate(updatePortfolioSchema),
        updatePortfolio
    )
    .delete(protect, restrictTo('admin'), deletePortfolio);

router
    .route('/:id/images/:imageId')
    .delete(protect, restrictTo('admin'), deletePortfolioImage);

module.exports = router;
