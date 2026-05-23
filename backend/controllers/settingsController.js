const User = require('../models/User');
const { testConnection } = require('../services/cloudStorageService');

exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences storageUsed name email avatar createdAt');
    res.json(user);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const {
      theme, ocrEnabled, ocrLanguage, exportQuality,
      defaultScanMode, autoArrange, autoDuplicate, cloudStorage
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Core preferences
    if (theme !== undefined) user.preferences.theme = theme;
    if (ocrEnabled !== undefined) user.preferences.ocrEnabled = ocrEnabled;
    if (ocrLanguage !== undefined) user.preferences.ocrLanguage = ocrLanguage;
    if (exportQuality !== undefined) user.preferences.exportQuality = exportQuality;
    if (defaultScanMode !== undefined) user.preferences.defaultScanMode = defaultScanMode;
    if (autoArrange !== undefined) user.preferences.autoArrange = autoArrange;
    if (autoDuplicate !== undefined) user.preferences.autoDuplicate = autoDuplicate;

    // Cloud storage config
    if (cloudStorage) {
      if (cloudStorage.provider !== undefined) {
        user.preferences.cloudStorage.provider = cloudStorage.provider;
      }
      if (cloudStorage.googleDrive) {
        user.preferences.cloudStorage.googleDrive = {
          ...user.preferences.cloudStorage.googleDrive,
          ...cloudStorage.googleDrive
        };
      }
      if (cloudStorage.dropbox) {
        user.preferences.cloudStorage.dropbox = {
          ...user.preferences.cloudStorage.dropbox,
          ...cloudStorage.dropbox
        };
      }
      if (cloudStorage.s3) {
        user.preferences.cloudStorage.s3 = {
          ...user.preferences.cloudStorage.s3,
          ...cloudStorage.s3
        };
      }
    }

    await user.save();
    res.json({ preferences: user.preferences });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.testCloudConnection = async (req, res) => {
  try {
    const { cloudConfig } = req.body;
    if (!cloudConfig) {
      return res.status(400).json({ msg: 'cloudConfig is required' });
    }
    const result = await testConnection(cloudConfig);
    res.json(result);
  } catch (err) {
    console.error('Test cloud connection error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
