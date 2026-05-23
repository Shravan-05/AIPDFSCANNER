const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Share = require('../models/Share');
const Scan = require('../models/Scan');
const PdfDocument = require('../models/PdfDocument');

const sanitizePdfData = (doc, modelName) => {
  const base = {
    _id: doc._id,
    title: doc.title || 'Untitled Document',
    modelName,
    pages: (doc.pages || []).map(p => ({
      _id: p._id,
      pageNumber: p.pageNumber,
      thumbnailUrl: p.thumbnailUrl,
      processedImage: p.processedImage,
      originalImage: p.originalImage
    })),
    totalPages: doc.totalPages || (doc.pages || []).length,
    fileSize: doc.fileSize,
    createdAt: doc.createdAt
  };

  if (modelName === 'PdfDocument') {
    base.filePath = doc.filePath;
    base.fileName = doc.fileName;
  }

  return base;
};

const getPdfById = async (pdfId, modelName) => {
  if (modelName === 'Scan') {
    return Scan.findById(pdfId).select('-ocrText');
  }
  return PdfDocument.findById(pdfId);
};

exports.createShareLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { model = 'Scan', expiresIn, password, maxAccessCount } = req.body;

    let pdf = await getPdfById(id, model);
    if (!pdf) {
      return res.status(404).json({ msg: 'PDF not found' });
    }

    const ownerId = pdf.userId || pdf.ownerId || pdf.user?._id || req.user.id;
    if (ownerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to share this PDF' });
    }

    const existing = await Share.findOne({ pdfId: id, pdfModel: model, ownerId: req.user.id, isActive: true });
    if (existing && !existing.isExpired()) {
      const shareUrl = `${req.protocol}://${req.get('host')}/share/${existing.shareToken}`;
      return res.json({
        success: true,
        shareUrl,
        token: existing.shareToken,
        expiresAt: existing.expiresAt,
        accessCount: existing.accessCount,
        maxAccessCount: existing.maxAccessCount,
        hasPassword: !!existing.passwordHash
      });
    }

    const token = crypto.randomBytes(24).toString('hex');

    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const share = new Share({
      pdfId: id,
      pdfModel: model,
      ownerId: req.user.id,
      shareToken: token,
      expiresAt,
      passwordHash,
      maxAccessCount: maxAccessCount || null
    });

    await share.save();

    const shareUrl = `${req.protocol}://${req.get('host')}/share/${token}`;

    res.status(201).json({
      success: true,
      shareUrl,
      token,
      expiresAt,
      accessCount: 0,
      maxAccessCount: maxAccessCount || null,
      hasPassword: !!password
    });
  } catch (err) {
    console.error('Create share error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.accessSharedPdf = async (req, res) => {
  try {
    const { token } = req.params;
    const share = await Share.findOne({ shareToken: token });

    if (!share) {
      return res.status(404).json({ msg: 'Share link not found', errorCode: 'NOT_FOUND' });
    }

    if (!share.isActive) {
      return res.status(410).json({ msg: 'This share link has been revoked', errorCode: 'REVOKED' });
    }

    if (share.isExpired()) {
      return res.status(410).json({ msg: 'This share link has expired', errorCode: 'EXPIRED' });
    }

    if (share.isAccessLimitReached()) {
      return res.status(410).json({ msg: 'View limit reached for this share link', errorCode: 'LIMIT_REACHED' });
    }

    if (share.passwordHash) {
      return res.json({
        requiresPassword: true,
        token: share.shareToken,
        msg: 'This file is password protected'
      });
    }

    share.accessCount += 1;
    share.lastAccessedAt = new Date();
    await share.save();

    const pdf = await getPdfById(share.pdfId, share.pdfModel);
    if (!pdf) {
      return res.status(404).json({ msg: 'The shared PDF no longer exists', errorCode: 'PDF_NOT_FOUND' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = share.pdfModel === 'Scan'
      ? `${host}/api/scans/${share.pdfId}/export`
      : `${host}/api/files/${share.pdfId}/download`;

    res.json({
      requiresPassword: false,
      pdf: sanitizePdfData(pdf, share.pdfModel),
      downloadUrl,
      previewUrl: downloadUrl,
      shareInfo: {
        createdAt: share.createdAt,
        accessCount: share.accessCount,
        modelName: share.pdfModel
      }
    });
  } catch (err) {
    console.error('Access share error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.verifyPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ msg: 'Password is required' });
    }

    const share = await Share.findOne({ shareToken: token });
    if (!share) {
      return res.status(404).json({ msg: 'Share link not found' });
    }

    if (!share.isActive) {
      return res.status(410).json({ msg: 'This share link has been revoked' });
    }

    if (share.isExpired()) {
      return res.status(410).json({ msg: 'This share link has expired' });
    }

    if (!share.passwordHash) {
      return res.json({ verified: true });
    }

    const isValid = await bcrypt.compare(password, share.passwordHash);
    if (!isValid) {
      return res.status(401).json({ msg: 'Incorrect password' });
    }

    share.accessCount += 1;
    share.lastAccessedAt = new Date();
    await share.save();

    const pdf = await getPdfById(share.pdfId, share.pdfModel);
    if (!pdf) {
      return res.status(404).json({ msg: 'The shared PDF no longer exists' });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = share.pdfModel === 'Scan'
      ? `${host}/api/scans/${share.pdfId}/export`
      : `${host}/api/files/${share.pdfId}/download`;

    res.json({
      verified: true,
      pdf: sanitizePdfData(pdf, share.pdfModel),
      downloadUrl,
      previewUrl: downloadUrl,
      shareInfo: {
        createdAt: share.createdAt,
        accessCount: share.accessCount,
        modelName: share.pdfModel
      }
    });
  } catch (err) {
    console.error('Verify password error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.revokeShareLink = async (req, res) => {
  try {
    const { token } = req.params;
    const share = await Share.findOne({ shareToken: token });

    if (!share) {
      return res.status(404).json({ msg: 'Share link not found' });
    }

    if (share.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to revoke this share link' });
    }

    share.isActive = false;
    await share.save();

    res.json({ success: true, msg: 'Share link revoked successfully' });
  } catch (err) {
    console.error('Revoke share error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getShareInfo = async (req, res) => {
  try {
    const { token } = req.params;
    const share = await Share.findOne({ shareToken: token });

    if (!share) {
      return res.status(404).json({ msg: 'Share link not found' });
    }

    if (share.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const pdf = await getPdfById(share.pdfId, share.pdfModel);

    res.json({
      success: true,
      share: {
        token: share.shareToken,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        isActive: share.isActive,
        accessCount: share.accessCount,
        lastAccessedAt: share.lastAccessedAt,
        maxAccessCount: share.maxAccessCount,
        hasPassword: !!share.passwordHash,
        pdfTitle: pdf?.title || 'Untitled'
      }
    });
  } catch (err) {
    console.error('Get share info error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getUserShares = async (req, res) => {
  try {
    const shares = await Share.find({ ownerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const pdfIds = shares.map(s => s.pdfId.toString());
    const scans = await Scan.find({ _id: { $in: pdfIds } }).select('title createdAt').lean();
    const docs = await PdfDocument.find({ _id: { $in: pdfIds } }).select('title createdAt').lean();
    const pdfMap = {};
    [...scans, ...docs].forEach(p => { pdfMap[p._id.toString()] = p; });

    const result = shares.map(s => ({
      ...s,
      pdfTitle: pdfMap[s.pdfId.toString()]?.title || 'Untitled'
    }));

    res.json({ success: true, shares: result });
  } catch (err) {
    console.error('Get user shares error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
