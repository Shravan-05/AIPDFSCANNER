const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const {
  createShareLink,
  accessSharedPdf,
  verifyPassword,
  downloadSharedPdf,
  revokeShareLink,
  getShareInfo,
  getUserShares
} = require('../controllers/shareController');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post('/pdf/:id/share', protect, [
  body('expiresIn').optional().isInt({ min: 60 }).withMessage('Expiry must be at least 60 seconds'),
  body('password').optional().isString().isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
  validate
], createShareLink);

router.get('/share/:token', accessSharedPdf);

router.post('/share/:token/verify', [
  body('password').notEmpty().withMessage('Password is required'),
  validate
], verifyPassword);

router.get('/share/:token/download', downloadSharedPdf);

router.delete('/share/:token', protect, revokeShareLink);

router.get('/share/:token/info', protect, getShareInfo);

router.get('/shares', protect, getUserShares);

module.exports = router;
