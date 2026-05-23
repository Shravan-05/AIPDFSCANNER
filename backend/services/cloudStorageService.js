const fs = require('fs');
const path = require('path');

/**
 * Cloud Storage Service - Handles upload simulations for Google Drive, Dropbox, and AWS S3
 * In production, replace simulation blocks with actual SDK calls.
 */

/**
 * Upload a file to the configured cloud provider
 * @param {string} filePath - Absolute path to the local file to upload
 * @param {string} fileName - Target file name on cloud
 * @param {Object} cloudConfig - Cloud storage config from user preferences
 * @returns {Object} { success, cloudUrl, provider }
 */
exports.uploadToCloud = async (filePath, fileName, cloudConfig) => {
  const provider = cloudConfig?.provider || 'none';

  if (provider === 'none' || !fs.existsSync(filePath)) {
    return { success: false, cloudUrl: null, provider };
  }

  const fileSize = fs.statSync(filePath).size;
  console.log(`[CloudStorage] Starting upload to ${provider}: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`);

  try {
    switch (provider) {
      case 'google-drive':
        return await uploadToGoogleDrive(filePath, fileName, cloudConfig.googleDrive);
      case 'dropbox':
        return await uploadToDropbox(filePath, fileName, cloudConfig.dropbox);
      case 's3':
        return await uploadToS3(filePath, fileName, cloudConfig.s3);
      default:
        return { success: false, cloudUrl: null, provider };
    }
  } catch (err) {
    console.error(`[CloudStorage] Upload to ${provider} failed:`, err.message);
    return { success: false, cloudUrl: null, provider, error: err.message };
  }
};

/**
 * Google Drive upload simulation
 */
async function uploadToGoogleDrive(filePath, fileName, config) {
  const { apiKey, folderId } = config || {};

  if (!apiKey || !folderId) {
    throw new Error('Google Drive requires apiKey and folderId');
  }

  // Simulate API latency
  await simulateUpload(300, 900);

  const fileId = `gdrive_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  const cloudUrl = `https://drive.google.com/file/d/${fileId}/view`;

  console.log(`[CloudStorage] Google Drive upload complete: ${cloudUrl}`);
  return {
    success: true,
    cloudUrl,
    provider: 'google-drive',
    fileId,
    folderId
  };
}

/**
 * Dropbox upload simulation
 */
async function uploadToDropbox(filePath, fileName, config) {
  const { accessToken } = config || {};

  if (!accessToken) {
    throw new Error('Dropbox requires an access token');
  }

  // Simulate API latency
  await simulateUpload(200, 700);

  const dropboxPath = `/AuraScan/${fileName}`;
  const sharedLinkId = `dbx_${Date.now().toString(36)}`;
  const cloudUrl = `https://www.dropbox.com/s/${sharedLinkId}/${encodeURIComponent(fileName)}`;

  console.log(`[CloudStorage] Dropbox upload complete: ${dropboxPath}`);
  return {
    success: true,
    cloudUrl,
    provider: 'dropbox',
    dropboxPath
  };
}

/**
 * AWS S3 upload simulation
 */
async function uploadToS3(filePath, fileName, config) {
  const { bucketName, awsRegion, awsAccessKeyId, awsSecretAccessKey } = config || {};

  if (!bucketName || !awsRegion || !awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS S3 requires bucketName, awsRegion, awsAccessKeyId, and awsSecretAccessKey');
  }

  // Simulate API latency
  await simulateUpload(400, 1200);

  const s3Key = `aurascan/pdfs/${Date.now()}-${fileName}`;
  const cloudUrl = `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${s3Key}`;

  console.log(`[CloudStorage] AWS S3 upload complete: ${cloudUrl}`);
  return {
    success: true,
    cloudUrl,
    provider: 's3',
    bucket: bucketName,
    key: s3Key,
    region: awsRegion
  };
}

/**
 * Simulate upload latency for realistic cloud timing
 */
function simulateUpload(minMs, maxMs) {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Test cloud connection with provided credentials
 */
exports.testConnection = async (cloudConfig) => {
  const provider = cloudConfig?.provider || 'none';

  if (provider === 'none') {
    return { success: false, message: 'No cloud provider selected' };
  }

  console.log(`[CloudStorage] Testing connection to ${provider}...`);
  await simulateUpload(150, 400);

  const hasValidCreds = validateCredentials(provider, cloudConfig);
  if (!hasValidCreds.valid) {
    return { success: false, message: hasValidCreds.message };
  }

  return {
    success: true,
    provider,
    message: `Successfully connected to ${getProviderName(provider)}`
  };
};

function validateCredentials(provider, config) {
  switch (provider) {
    case 'google-drive':
      if (!config?.googleDrive?.apiKey) return { valid: false, message: 'Google Drive API Key is required' };
      if (!config?.googleDrive?.folderId) return { valid: false, message: 'Google Drive Folder ID is required' };
      return { valid: true };
    case 'dropbox':
      if (!config?.dropbox?.accessToken) return { valid: false, message: 'Dropbox Access Token is required' };
      return { valid: true };
    case 's3':
      if (!config?.s3?.bucketName) return { valid: false, message: 'AWS S3 Bucket Name is required' };
      if (!config?.s3?.awsAccessKeyId) return { valid: false, message: 'AWS Access Key ID is required' };
      if (!config?.s3?.awsSecretAccessKey) return { valid: false, message: 'AWS Secret Access Key is required' };
      return { valid: true };
    default:
      return { valid: false, message: 'Unknown provider' };
  }
}

function getProviderName(provider) {
  const names = {
    'google-drive': 'Google Drive',
    'dropbox': 'Dropbox',
    's3': 'AWS S3'
  };
  return names[provider] || provider;
}
