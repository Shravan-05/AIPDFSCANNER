const Scan = require('../models/Scan');
const PdfDocument = require('../models/PdfDocument');
const fs = require('fs');
const path = require('path');

exports.getFiles = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sort = '-createdAt' } = req.query;

    // Scans query
    const queryScan = { user: req.user.id, status: 'completed' };
    if (search) {
      queryScan.title = { $regex: search, $options: 'i' };
    }

    // PdfDocuments query
    const queryPdf = { user: req.user.id };
    if (search) {
      queryPdf.originalFilename = { $regex: search, $options: 'i' };
    }

    const [scans, pdfs] = await Promise.all([
      Scan.find(queryScan).select('title totalPages fileSize createdAt updatedAt isFavorite pdfUrl'),
      PdfDocument.find(queryPdf).select('originalFilename numPages size filepath createdAt updatedAt')
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
      isFavorite: false, // Default for imported PDFs
      pdfUrl: p.filepath,
      type: 'pdf'
    }));

    const combinedFiles = [...scanFiles, ...pdfFiles];

    // In-memory sorting
    if (sort === 'createdAt') {
      combinedFiles.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === '-createdAt') {
      combinedFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'title') {
      combinedFiles.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === '-title') {
      combinedFiles.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort === 'fileSize') {
      combinedFiles.sort((a, b) => a.size - b.size);
    } else if (sort === '-fileSize') {
      combinedFiles.sort((a, b) => b.size - a.size);
    }

    // Pagination
    const total = combinedFiles.length;
    const itemsLimit = parseInt(limit);
    const itemsPage = parseInt(page);
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
      if (fs.existsSync(fullPath)) {
        return res.download(fullPath, pdfDoc.originalFilename);
      }
      return res.status(404).json({ msg: 'PDF file not found on disk.' });
    }

    if (scan.pdfUrl && fs.existsSync(scan.pdfUrl)) {
      return res.download(scan.pdfUrl, `${scan.title}.pdf`);
    }
    res.status(404).json({ msg: 'PDF not generated yet. Please export first.' });
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
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
      }
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
    filesToDelete.forEach(f => {
      if (f && fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch (e) { /* ignore */ }
      }
    });
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
