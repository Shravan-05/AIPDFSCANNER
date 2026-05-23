const Scan = require('../models/Scan');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');
const { processImage, processImageCustom } = require('../services/imageProcessor');
const { generatePdf } = require('../services/pdfGenerator');
const { extractText, batchExtract } = require('../services/ocrService');
const { calculateStorageUsed } = require('../utils/helpers');
const { uploadToCloud } = require('../services/cloudStorageService');

exports.createScan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No files uploaded' });
    }
    const { title, scanMode = 'color', ocrEnabled = true } = req.body;
    const scan = new Scan({
      user: req.user.id,
      title: title || `Scan ${new Date().toLocaleDateString()}`,
      status: 'processing',
      scanMode
    });
    let totalSize = 0;
    
    const processPromises = req.files.map(async (file, i) => {
      const pageNumber = i + 1;
      const result = await processImage(file.path, {
        autoCropEnabled: true,
        enhanceEnabled: true,
        scanMode
      });
      return { file, pageNumber, result };
    });
    
    const processedResults = await Promise.all(processPromises);

    for (const { file, pageNumber, result } of processedResults) {
      totalSize += file.size;
      scan.pages.push({
        originalImage: file.path,
        processedImage: result.processedPath,
        thumbnailUrl: result.thumbnailPath,
        pageNumber,
        ocrText: '',
        enhancement: { brightness: 1.0, contrast: 1.0, saturation: 1.0, sharpness: 1.0 }
      });
    }
    const getPageNumberMarker = (page) => {
      if (page.ocrText) {
        const match = page.ocrText.match(/(?:page|pg\.?)\s*(\d+)/i) || 
                      page.ocrText.match(/(\d+)\s*of\s*\d+/i) || 
                      page.ocrText.match(/\b(\d+)\b/);
        if (match) {
          const num = parseInt(match[1]);
          if (!isNaN(num)) return num;
        }
      }
      const numMatch = page.originalImage.match(/_(\d+)\./) || page.originalImage.match(/(\d+)\D*$/);
      if (numMatch) {
        const num = parseInt(numMatch[1]);
        if (!isNaN(num)) return num;
      }
      return page.pageNumber;
    };

    scan.pages.sort((a, b) => getPageNumberMarker(a) - getPageNumberMarker(b));
    
    scan.pages.forEach((p, idx) => {
      p.pageNumber = idx + 1;
    });

    const allOcrText = scan.pages.map(p => p.ocrText).filter(Boolean).join(' ');
    scan.ocrText = allOcrText;
    scan.totalPages = scan.pages.length;
    scan.fileSize = totalSize;
    scan.status = 'completed';
    await scan.save();
    
    const user = await User.findById(req.user.id);
    user.storageUsed += totalSize;
    await user.save();
    
    res.status(201).json(scan);

    if (ocrEnabled) {
      const ocrLang = user?.preferences?.ocrLanguage || 'eng';
      const ocrPages = scan.pages.filter(p => p.processedImage);
      exports._runBackgroundOcr(scan._id, ocrPages, ocrLang);
    }
  } catch (err) {
    console.error('Create scan error:', err);
    if (err.message && err.message.includes('unsupported image format')) {
      return res.status(400).json({ msg: 'Invalid file uploaded. Please upload image files (JPEG, PNG, WebP) only, not raw PDFs.' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
};

exports._runBackgroundOcr = async (scanId, pages, lang) => {
  try {
    const results = await batchExtract(
      pages.map(p => p.processedImage),
      lang
    );
    const scan = await Scan.findById(scanId);
    if (!scan) return;
    results.forEach((ocr, i) => {
      if (pages[i]) pages[i].ocrText = ocr.text;
    });
    scan.ocrText = pages.map(p => p.ocrText).filter(Boolean).join(' ');
    scan.markModified('pages');
    await scan.save();
  } catch (err) {
    console.error('Background OCR Error:', err);
  }
};

exports.addPages = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) return res.status(404).json({ msg: 'Scan not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No files uploaded' });
    }

    const scanMode = scan.scanMode || 'color';
    let totalSize = 0;
    let pageCounter = scan.pages.length + 1;

    const processPromises = req.files.map(async (file) => {
      const result = await processImage(file.path, {
        autoCropEnabled: true,
        enhanceEnabled: true,
        scanMode
      });
      return { file, result };
    });
    
    const processedResults = await Promise.all(processPromises);

    const newPages = [];
    for (const { file, result } of processedResults) {
      totalSize += file.size;
      const page = {
        originalImage: file.path,
        processedImage: result.processedPath,
        thumbnailUrl: result.thumbnailPath,
        pageNumber: pageCounter++,
        ocrText: '',
        enhancement: { brightness: 1.0, contrast: 1.0, saturation: 1.0, sharpness: 1.0 }
      };
      scan.pages.push(page);
      newPages.push(page);
    }

    scan.totalPages = scan.pages.filter(p => !p.isDeleted).length;
    scan.fileSize += totalSize;
    scan.ocrText = scan.pages.map(p => p.ocrText).filter(Boolean).join(' ');
    
    await scan.save();
    
    const user = await User.findById(req.user.id);
    user.storageUsed += totalSize;
    await user.save();

    res.status(200).json(scan);

    const newOcrPages = newPages.filter(p => p.processedImage);
    if (newOcrPages.length > 0) {
      const ocrLang = user?.preferences?.ocrLanguage || 'eng';
      exports._runBackgroundOcr(scan._id, newOcrPages, ocrLang);
    }
  } catch (err) {
    console.error('Add pages error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getScan = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id, 'pages.isDeleted': false });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    res.json(scan);
  } catch (err) {
    console.error('Get scan error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getScans = async (req, res) => {
  try {
    const { page = 1, limit = 12, search, status, folder, isFavorite, sort = '-createdAt' } = req.query;
    const query = { user: req.user.id };
    if (status) query.status = status;
    if (folder) query.folder = folder;
    if (isFavorite === 'true') query.isFavorite = true;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { ocrText: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    const total = await Scan.countDocuments(query);
    const scans = await Scan.find(query)
      .select({
        title: 1,
        totalPages: 1,
        fileSize: 1,
        status: 1,
        scanMode: 1,
        isFavorite: 1,
        tags: 1,
        folder: 1,
        pdfUrl: 1,
        createdAt: 1,
        updatedAt: 1,
        pages: { $slice: 1 }
      })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ scans, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get scans error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateScan = async (req, res) => {
  try {
    const { title, description, tags, folder } = req.body;
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    if (title) scan.title = title;
    if (description !== undefined) scan.description = description;
    if (tags) scan.tags = tags;
    if (folder !== undefined) scan.folder = folder;
    await scan.save();
    res.json(scan);
  } catch (err) {
    console.error('Update scan error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteScan = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    scan.status = 'failed';
    await scan.save();
    const user = await User.findById(req.user.id);
    user.storageUsed = Math.max(0, user.storageUsed - scan.fileSize);
    await user.save();
    res.json({ msg: 'Scan removed' });
  } catch (err) {
    console.error('Delete scan error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    scan.isFavorite = !scan.isFavorite;
    await scan.save();
    res.json({ isFavorite: scan.isFavorite });
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.reorderPages = async (req, res) => {
  try {
    const { pageOrder } = req.body;
    if (!Array.isArray(pageOrder)) {
      return res.status(400).json({ msg: 'pageOrder must be an array of page IDs' });
    }
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    const pageMap = {};
    scan.pages.forEach(p => { pageMap[p._id.toString()] = p; });
    const reordered = pageOrder.map(id => pageMap[id]).filter(Boolean);
    if (reordered.length !== scan.pages.length) {
      return res.status(400).json({ msg: 'Invalid page order' });
    }
    reordered.forEach((p, i) => { p.pageNumber = i + 1; });
    scan.pages = reordered;
    await Scan.updateOne({ _id: req.params.id }, { $set: { pages: scan.pages } });
    res.json(scan);
  } catch (err) {
    console.error('Reorder pages error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.rotatePage = async (req, res) => {
  try {
    const { rotation } = req.body;
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    const page = scan.pages.id(req.params.pageId);
    if (!page) {
      return res.status(404).json({ msg: 'Page not found' });
    }
    page.rotation = (page.rotation + (rotation || 90)) % 360;
    await Scan.updateOne({ _id: req.params.id }, { $set: { pages: scan.pages } });
    res.json(scan);
  } catch (err) {
    console.error('Rotate page error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deletePage = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    const page = scan.pages.id(req.params.pageId);
    if (!page) {
      return res.status(404).json({ msg: 'Page not found' });
    }
    page.isDeleted = true;
    scan.totalPages = scan.pages.filter(p => !p.isDeleted).length;
    await Scan.updateOne({ _id: req.params.id }, { $set: { pages: scan.pages, totalPages: scan.totalPages } });
    res.json(scan);
  } catch (err) {
    console.error('Delete page error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.duplicatePage = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    const sourcePage = scan.pages.id(req.params.pageId);
    if (!sourcePage) {
      return res.status(404).json({ msg: 'Page not found' });
    }
    const newPage = sourcePage.toObject();
    delete newPage._id;
    newPage.isDuplicate = true;
    newPage.pageNumber = scan.pages.length + 1;
    scan.pages.push(newPage);
    scan.totalPages = scan.pages.length;
    await Scan.updateOne({ _id: req.params.id }, { $set: { pages: scan.pages, totalPages: scan.totalPages } });
    res.json(scan);
  } catch (err) {
    console.error('Duplicate page error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.exportPdf = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    const user = await User.findById(req.user.id);
    const quality = user.preferences?.exportQuality || 'standard';
    const password = req.query.password || null;
    
    const pdfPath = await generatePdf(scan.pages.filter(p => !p.isDeleted), {
      title: scan.title,
      quality,
      password
    });
    scan.pdfUrl = pdfPath;
    scan.exportHistory.push({ url: pdfPath, format: 'pdf', createdAt: new Date() });
    await scan.save();

    const cloudConfig = user.preferences?.cloudStorage;
    if (cloudConfig?.provider && cloudConfig.provider !== 'none') {
      const fileName = `${scan.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      uploadToCloud(pdfPath, fileName, cloudConfig)
        .then(result => {
          if (result.success) {
            console.log(`[CloudStorage] PDF uploaded to ${result.provider}: ${result.cloudUrl}`);
          }
        })
        .catch(err => console.error('[CloudStorage] Background upload error:', err));
    }

    res.download(pdfPath, `${scan.title}.pdf`);
  } catch (err) {
    console.error('Export PDF error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const totalScans = await Scan.countDocuments({ user: userId, status: { $ne: 'failed' } });
    const totalPages = await Scan.aggregate([
      { $match: { user: userId, status: { $ne: 'failed' } } },
      { $group: { _id: null, total: { $sum: '$totalPages' } } }
    ]);
    const favoriteScans = await Scan.countDocuments({ user: userId, isFavorite: true });
    const recentScans = await Scan.find({ user: userId, status: { $ne: 'failed' } })
      .select('-pages')
      .sort('-createdAt')
      .limit(5);
    const storageUsed = await calculateStorageUsed(Scan, userId);
    res.json({
      totalScans,
      totalPages: totalPages.length > 0 ? totalPages[0].total : 0,
      favoriteScans,
      storageUsed,
      recentScans
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updatePage = async (req, res) => {
  try {
    const { id, pageId } = req.params;
    const { cropCoordinates, enhancement, scanMode } = req.body;
    
    const scan = await Scan.findOne({ _id: id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    
    const page = scan.pages.id(pageId);
    if (!page) {
      return res.status(404).json({ msg: 'Page not found' });
    }
    
    const result = await processImageCustom(page.originalImage, {
      cropCoordinates,
      enhancement,
      scanMode
    });
    
    const oldProcessed = page.processedImage;
    const oldThumb = page.thumbnailUrl;
    
    await Promise.all([
      oldProcessed && oldProcessed !== page.originalImage
        ? fs.promises.unlink(oldProcessed).catch(() => {}) : Promise.resolve(),
      oldThumb && oldThumb !== page.originalImage
        ? fs.promises.unlink(oldThumb).catch(() => {}) : Promise.resolve()
    ]);
    
    page.processedImage = result.processedPath;
    page.thumbnailUrl = result.thumbnailPath;
    if (cropCoordinates) page.cropCoordinates = cropCoordinates;
    if (enhancement) page.enhancement = enhancement;
    if (scanMode) {
      try {
        const ocr = await extractText(result.processedPath);
        page.ocrText = ocr.text;
      } catch (ocrErr) {
        console.error('OCR re-run error:', ocrErr);
      }
    }
    
    await Scan.updateOne({ _id: id }, { $set: { pages: scan.pages } });
    res.json(scan);
  } catch (err) {
    console.error('Update page error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.autoArrangePages = async (req, res) => {
  try {
    const { id } = req.params;
    const scan = await Scan.findOne({ _id: id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }
    
    // Smart arrange logic:
    // Extract page numbers from OCR text or filenames, and sort
    const activePages = scan.pages.filter(p => !p.isDeleted);
    
    const getPageNumberMarker = (page) => {
      // 1. Try to find a page pattern in OCR text: e.g., "Page 3", "3 of 5", "page: 3", etc.
      if (page.ocrText) {
        const match = page.ocrText.match(/(?:page|pg\.?)\s*(\d+)/i) || 
                      page.ocrText.match(/(\d+)\s*of\s*\d+/i) || 
                      page.ocrText.match(/\b(\d+)\b/); // fallback to any standalone digit
        if (match) {
          const num = parseInt(match[1]);
          if (!isNaN(num)) return num;
        }
      }
      // 2. Try to find number in original filename (originalImage path contains UUID or original name if preserved, but we can look for numbers)
      const numMatch = page.originalImage.match(/_(\d+)\./) || page.originalImage.match(/(\d+)\D*$/);
      if (numMatch) {
        const num = parseInt(numMatch[1]);
        if (!isNaN(num)) return num;
      }
      // 3. Fallback to its current pageNumber
      return page.pageNumber;
    };
    
    // Sort pages
    const sortedPages = [...scan.pages].sort((a, b) => {
      if (a.isDeleted && !b.isDeleted) return 1;
      if (!a.isDeleted && b.isDeleted) return -1;
      
      const numA = getPageNumberMarker(a);
      const numB = getPageNumberMarker(b);
      return numA - numB;
    });
    
    // Re-assign pageNumbers
    sortedPages.forEach((p, idx) => {
      if (!p.isDeleted) {
        p.pageNumber = idx + 1;
      }
    });
    
    scan.pages = sortedPages;
    await Scan.updateOne({ _id: id }, { $set: { pages: scan.pages } });
    res.json(scan);
  } catch (err) {
    console.error('Auto arrange error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Merge multiple scans into a single new scan document
 * POST /api/scans/merge
 */
exports.mergeScans = async (req, res) => {
  try {
    const { scanIds, title } = req.body;
    if (!Array.isArray(scanIds) || scanIds.length < 2) {
      return res.status(400).json({ msg: 'At least 2 scan IDs are required to merge' });
    }

    // Fetch all scans in order, verify ownership
    const scans = await Scan.find({ _id: { $in: scanIds }, user: req.user.id });
    if (scans.length !== scanIds.length) {
      return res.status(404).json({ msg: 'One or more scans not found or unauthorized' });
    }

    // Sort scans to match requested order
    const scanMap = {};
    scans.forEach(s => { scanMap[s._id.toString()] = s; });
    const orderedScans = scanIds.map(id => scanMap[id]).filter(Boolean);

    // Collect all active (non-deleted) pages in merged order
    const mergedPages = [];
    let pageIndex = 1;
    for (const scan of orderedScans) {
      for (const page of scan.pages.filter(p => !p.isDeleted)) {
        const newPage = page.toObject();
        delete newPage._id;
        newPage.pageNumber = pageIndex++;
        mergedPages.push(newPage);
      }
    }

    if (mergedPages.length === 0) {
      return res.status(400).json({ msg: 'No active pages found in selected scans' });
    }

    const mergedTitle = title || `Merged Document ${new Date().toLocaleDateString()}`;

    // Generate merged PDF
    const user = await User.findById(req.user.id);
    const quality = user.preferences?.exportQuality || 'standard';
    const pdfPath = await generatePdf(mergedPages, { title: mergedTitle, quality });

    let totalSize = 0;
    for (const p of mergedPages) {
      try {
        await fs.promises.stat(p.originalImage).then(s => { totalSize += s.size; }).catch(() => {});
      } catch {}
    }

    // Create new merged scan record
    const mergedScan = new Scan({
      user: req.user.id,
      title: mergedTitle,
      status: 'completed',
      scanMode: orderedScans[0].scanMode || 'color',
      pages: mergedPages,
      totalPages: mergedPages.length,
      fileSize: totalSize,
      pdfUrl: pdfPath,
      ocrText: mergedPages.map(p => p.ocrText).filter(Boolean).join(' '),
      exportHistory: [{ url: pdfPath, format: 'pdf', createdAt: new Date() }]
    });
    await mergedScan.save();

    // Update user storage
    user.storageUsed += totalSize;
    await user.save();

    res.status(201).json(mergedScan);
  } catch (err) {
    console.error('Merge scans error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

/**
 * Split a multi-page scan into individual single-page scans
 * POST /api/scans/:id/split
 */
exports.splitScan = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      return res.status(404).json({ msg: 'Scan not found' });
    }

    const activePages = scan.pages.filter(p => !p.isDeleted);
    if (activePages.length < 2) {
      return res.status(400).json({ msg: 'Scan must have at least 2 pages to split' });
    }

    const user = await User.findById(req.user.id);
    const quality = user.preferences?.exportQuality || 'standard';
    const createdScans = [];

    for (let i = 0; i < activePages.length; i++) {
      const page = activePages[i];
      const pageTitle = `${scan.title} - Page ${i + 1}`;

      const singlePage = page.toObject();
      delete singlePage._id;
      singlePage.pageNumber = 1;

      // Generate single-page PDF
      const pdfPath = await generatePdf([singlePage], { title: pageTitle, quality });

      let pageSize = 0;
      try {
        await fs.promises.stat(singlePage.originalImage).then(s => { pageSize = s.size; }).catch(() => {});
      } catch {};

      const splitScan = new Scan({
        user: req.user.id,
        title: pageTitle,
        status: 'completed',
        scanMode: scan.scanMode || 'color',
        pages: [singlePage],
        totalPages: 1,
        fileSize: pageSize,
        pdfUrl: pdfPath,
        ocrText: singlePage.ocrText || '',
        exportHistory: [{ url: pdfPath, format: 'pdf', createdAt: new Date() }]
      });
      await splitScan.save();
      createdScans.push(splitScan);
    }

    // Mark original scan as split (soft delete)
    scan.status = 'failed';
    await scan.save();

    res.json({ msg: 'Scan split successfully', count: createdScans.length, newScans: createdScans });
  } catch (err) {
    console.error('Split scan error:', err);
    res.status(500).json({ msg: 'Server error during split' });
  }
};

/**
 * Apply annotation overlay to a page
 * @route   POST /api/scans/:id/pages/:pageId/annotate
 */
exports.annotatePage = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) return res.status(404).json({ msg: 'Scan not found' });

    const page = scan.pages.id(req.params.pageId);
    if (!page) return res.status(404).json({ msg: 'Page not found' });

    if (!req.file) {
      return res.status(400).json({ msg: 'No annotation image uploaded' });
    }

    const { applyAnnotation } = require('../services/imageProcessor');
    
    // We apply the annotation to the current processedImage
    const result = await applyAnnotation(page.processedImage, req.file.path);
    
    page.processedImage = result.processedPath;
    page.thumbnailUrl = result.thumbnailPath;

    await scan.save();

    await fs.promises.unlink(req.file.path).catch(() => {});

    res.json({ msg: 'Annotation applied successfully', page });
  } catch (err) {
    console.error('Annotate page error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
