const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  createScan, getScan, getScans, updateScan, deleteScan,
  toggleFavorite, reorderPages, rotatePage, deletePage,
  duplicatePage, exportPdf, getStats, updatePage, autoArrangePages,
  mergeScans, splitScan, annotatePage, addPages
} = require('../controllers/scanController');

router.use(protect);

router.get('/stats', getStats);

router.post('/', upload.array('images', 200), [
  body('title').optional().trim()
], createScan);

router.post('/:id/pages', upload.array('images', 200), addPages);

router.get('/', getScans);
router.get('/:id', getScan);
router.put('/:id', updateScan);
router.delete('/:id', deleteScan);

router.put('/:id/favorite', toggleFavorite);
router.put('/:id/reorder', reorderPages);

router.put('/:id/pages/:pageId/rotate', rotatePage);
router.delete('/:id/pages/:pageId', deletePage);
router.post('/:id/pages/:pageId/duplicate', duplicatePage);

router.get('/:id/export', exportPdf);

router.put('/:id/pages/:pageId', updatePage);
router.post('/:id/auto-arrange', autoArrangePages);
router.post('/:id/split', splitScan);
router.post('/:id/pages/:pageId/annotate', upload.single('annotationImage'), annotatePage);

// Merge route (no :id param — operates on multiple scans)
router.post('/merge', mergeScans);

module.exports = router;
