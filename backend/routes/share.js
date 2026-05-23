const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
  createShareLink,
  accessSharedPdf,
  verifyPassword,
  revokeShareLink,
  getShareInfo,
  getUserShares
} = require('../controllers/shareController');

router.post('/pdf/:id/share', protect, [
  body('expiresIn').optional().isInt({ min: 60 }).withMessage('Expiry must be at least 60 seconds'),
  body('password').optional().isString().isLength({ min: 4 }).withMessage('Password must be at least 4 characters')
], createShareLink);

router.get('/share/:token', accessSharedPdf);

router.post('/share/:token/verify', [
  body('password').notEmpty().withMessage('Password is required')
], verifyPassword);

router.delete('/share/:token', protect, revokeShareLink);

router.get('/share/:token/info', protect, getShareInfo);

router.get('/shares', protect, getUserShares);

module.exports = router;
