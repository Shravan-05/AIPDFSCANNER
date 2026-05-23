const Tesseract = require('tesseract.js');

const SUPPORTED_LANGUAGES = {
  eng: 'English',
  spa: 'Spanish',
  fra: 'French',
  deu: 'German',
  chi_sim: 'Chinese (Simplified)',
  jpn: 'Japanese',
  ara: 'Arabic',
  por: 'Portuguese',
  hin: 'Hindi',
  kor: 'Korean'
};

/**
 * Extract text from an image using Tesseract OCR
 * @param {string} imagePath - Path to the image file
 * @param {string} lang - Tesseract language code (default: 'eng')
 */
exports.extractText = async (imagePath, lang = 'eng') => {
  try {
    // Validate language code; fallback to english if unknown
    const langCode = SUPPORTED_LANGUAGES[lang] ? lang : 'eng';

    const { data } = await Tesseract.recognize(imagePath, langCode, {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          const pct = Math.round(info.progress * 100);
          if (pct % 25 === 0) {
            console.log(`OCR [${langCode}] progress: ${pct}%`);
          }
        }
      }
    });

    return {
      text: data.text || '',
      confidence: data.confidence || 0,
      words: data.words || [],
      language: langCode
    };
  } catch (err) {
    console.error('OCR extraction error:', err);
    return { text: '', confidence: 0, words: [], language: lang };
  }
};

/**
 * Batch extract text from multiple image paths
 * @param {string[]} imagePaths - Array of image paths
 * @param {string} lang - Tesseract language code
 */
exports.batchExtract = async (imagePaths, lang = 'eng') => {
  const results = [];
  for (const imagePath of imagePaths) {
    const result = await exports.extractText(imagePath, lang);
    results.push(result);
  }
  return results;
};

exports.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
