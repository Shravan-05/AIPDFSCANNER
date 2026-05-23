const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getSettings, updateSettings, testCloudConnection } = require('../controllers/settingsController');

router.use(protect);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/test-cloud', testCloudConnection);

module.exports = router;
