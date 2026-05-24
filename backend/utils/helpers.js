const path = require('path');
const { v4: uuidv4 } = require('uuid');

exports.generateFileName = (originalName) => {
  const ext = path.extname(originalName);
  return `${uuidv4()}${ext}`;
};

exports.generateFilePath = (userId, fileName) => {
  return path.join('uploads', userId, fileName);
};

exports.getFileUrl = (req, fileName) => {
  return `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
};

exports.slugify = (text) => {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

exports.calculateStorageUsed = async (Scan, userId) => {
  const result = await Scan.aggregate([
    { $match: { user: userId, status: { $ne: 'failed' } } },
    { $group: { _id: null, total: { $sum: '$fileSize' } } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

exports.pMap = async (items, fn, concurrency = 3) => {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
};
