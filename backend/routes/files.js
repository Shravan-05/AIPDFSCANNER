const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getFiles, downloadFile, deleteFile, renameFile
} = require('../controllers/fileController');

router.use(protect);

router.get('/', getFiles);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);
router.put('/:id/rename', renameFile);

module.exports = router;
