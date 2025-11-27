const express = require('express');
const {
    register,
    login,
    refreshToken,
    getMe,
    logout,
    updateProfile,
    changePassword,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const {
    validate,
    registerSchema,
    loginSchema,
    refreshTokenSchema,
} = require('../middleware/validation');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.post('/logout', logout);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

module.exports = router;
