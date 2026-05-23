const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  storageUsed: {
    type: Number,
    default: 0
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    ocrEnabled: {
      type: Boolean,
      default: true
    },
    ocrLanguage: {
      type: String,
      enum: ['eng', 'spa', 'fra', 'deu', 'chi_sim', 'jpn', 'ara', 'por', 'hin', 'kor'],
      default: 'eng'
    },
    exportQuality: {
      type: String,
      enum: ['draft', 'standard', 'high'],
      default: 'standard'
    },
    defaultScanMode: {
      type: String,
      enum: ['color', 'grayscale', 'blackwhite'],
      default: 'color'
    },
    autoArrange: {
      type: Boolean,
      default: true
    },
    autoDuplicate: {
      type: Boolean,
      default: true
    },
    cloudStorage: {
      provider: {
        type: String,
        enum: ['none', 'google-drive', 'dropbox', 's3'],
        default: 'none'
      },
      googleDrive: {
        apiKey: { type: String, default: '' },
        folderId: { type: String, default: '' }
      },
      dropbox: {
        accessToken: { type: String, default: '' }
      },
      s3: {
        bucketName: { type: String, default: '' },
        awsRegion: { type: String, default: 'us-east-1' },
        awsAccessKeyId: { type: String, default: '' },
        awsSecretAccessKey: { type: String, default: '' }
      }
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
