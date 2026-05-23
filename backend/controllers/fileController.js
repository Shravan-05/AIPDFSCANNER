const Scan = require('../models/Scan');
const PdfDocument = require('../models/PdfDocument');
const fs = require('fs');
const path = require('path');

exports.getFiles = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sort = '-createdAt' } = req.query;

    const queryScan = { user: req.user.id, status: 'completed' };
    const queryPdf = { user: req.user.id };
    if (search) {
      queryScan.title = { $regex: search, $options: 'i' };
      queryPdf.originalFilename = { $regex: search, $options: 'i' };
    }

    const itemsLimit = parseInt(limit);
    const itemsPage = parseInt(page);

    const [scans, pdfs, totalScans, totalPdfs] = await Promise.all([
      Scan.find(queryScan)
        .select('title totalPages fileSize createdAt updatedAt isFavorite pdfUrl')
        .sort(sort)
        .lean(),
      PdfDocument.find(queryPdf)
        .select('originalFilename numPages size filepath createdAt updatedAt')
        .sort(sort)
        .lean(),
      Scan.countDocuments(queryScan),
      PdfDocument.countDocuments(queryPdf)
    ]);

    const scanFiles = scans.map(s => ({
      id: s._id,
      name: s.title,
      pages: s.totalPages,
      size: s.fileSize || 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      isFavorite: s.isFavorite,
      pdfUrl: s.pdfUrl,
      type: 'scan'
    }));

    const pdfFiles = pdfs.map(p => ({
      id: p._id,
      name: p.originalFilename,
      pages: p.numPages || 1,
      size: p.size || 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isFavorite: false,
      pdfUrl: p.filepath,
      type: 'pdf'
    }));

    const combinedFiles = [...scanFiles, ...pdfFiles];
    const total = totalScans + totalPdfs;
    const paginatedFiles = combinedFiles.slice((itemsPage - 1) * itemsLimit, itemsPage * itemsLimit);

    res.json({
      files: paginatedFiles,
      total,
      page: itemsPage,
      pages: Math.ceil(total / itemsLimit)
    });
  } catch (err) {
    console.error('Get files error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      const pdfDoc = await PdfDocument.findOne({ _id: req.params.id, user: req.user.id });
      if (!pdfDoc) {
        return res.status(404).json({ msg: 'File not found' });
      }

      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const fullPath = path.join(uploadDir, pdfDoc.currentFilename);
      try {
        await fs.promises.access(fullPath);
        return res.download(fullPath, pdfDoc.originalFilename);
      } catch {
        return res.status(404).json({ msg: 'PDF file not found on disk.' });
      }
    }

    try {
      await fs.promises.access(scan.pdfUrl);
      return res.download(scan.pdfUrl, `${scan.title}.pdf`);
    } catch {
      res.status(404).json({ msg: 'PDF not generated yet. Please export first.' });
    }
  } catch (err) {
    console.error('Download file error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      const pdfDoc = await PdfDocument.findOne({ _id: req.params.id, user: req.user.id });
      if (!pdfDoc) {
        return res.status(404).json({ msg: 'File not found' });
      }

      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const fullPath = path.join(uploadDir, pdfDoc.currentFilename);
      await fs.promises.unlink(fullPath).catch(() => {});
      await PdfDocument.deleteOne({ _id: req.params.id });
      return res.json({ msg: 'File deleted' });
    }

    const filesToDelete = [];
    scan.pages.forEach(p => {
      if (p.originalImage) filesToDelete.push(p.originalImage);
      if (p.processedImage) filesToDelete.push(p.processedImage);
      if (p.thumbnailUrl) filesToDelete.push(p.thumbnailUrl);
    });
    if (scan.pdfUrl) filesToDelete.push(scan.pdfUrl);
    await Promise.all(
      filesToDelete.map(f => f && fs.promises.unlink(f).catch(() => {}))
    );
    await Scan.deleteOne({ _id: req.params.id });
    res.json({ msg: 'File deleted' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.renameFile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ msg: 'Name is required' });
    }
    
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      const pdfDoc = await PdfDocument.findOne({ _id: req.params.id, user: req.user.id });
      if (!pdfDoc) {
        return res.status(404).json({ msg: 'File not found' });
      }

      pdfDoc.originalFilename = name.endsWith('.pdf') ? name : `${name}.pdf`;
      await pdfDoc.save();
      return res.json({ id: pdfDoc._id, name: pdfDoc.originalFilename });
    }

    scan.title = name;
    await scan.save();
    res.json({ id: scan._id, name: scan.title });
  } catch (err) {
    console.error('Rename file error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.shareFile = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.id, user: req.user.id });
    if (!scan) {
      const pdfDoc = await PdfDocument.findOne({ _id: req.params.id, user: req.user.id });
      if (!pdfDoc) {
        return res.status(404).json({ msg: 'File not found' });
      }

      const shareToken = Buffer.from(`${pdfDoc._id}-${Date.now()}`).toString('base64').replace(/=/g, '');
      const shareUrl = `${req.protocol}://${req.get('host')}/api/files/shared/${shareToken}`;
      return res.json({ shareUrl, token: shareToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    }

    const shareToken = Buffer.from(`${scan._id}-${Date.now()}`).toString('base64').replace(/=/g, '');
    const shareUrl = `${req.protocol}://${req.get('host')}/api/files/shared/${shareToken}`;
    res.json({ shareUrl, token: shareToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  } catch (err) {
    console.error('Share file error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
