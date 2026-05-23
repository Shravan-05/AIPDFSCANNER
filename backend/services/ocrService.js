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

const MAX_CONCURRENT_OCR = 2;
let activeOcrCount = 0;
const ocrQueue = [];

function dequeueOcr() {
  if (ocrQueue.length === 0 || activeOcrCount >= MAX_CONCURRENT_OCR) return;
  const { imagePath, langCode, resolve, reject } = ocrQueue.shift();
  activeOcrCount++;
  runOcr(imagePath, langCode).then(resolve, reject).finally(() => {
    activeOcrCount--;
    dequeueOcr();
  });
}

function runOcr(imagePath, langCode) {
  return Tesseract.recognize(imagePath, langCode, {
    logger: (info) => {
      if (info.status === 'recognizing text') {
        const pct = Math.round(info.progress * 100);
        if (pct % 25 === 0) {
          console.log(`OCR [${langCode}] progress: ${pct}%`);
        }
      }
    }
  }).then(({ data }) => ({
    text: data.text || '',
    confidence: data.confidence || 0,
    words: data.words || [],
    language: langCode
  }));
}

exports.extractText = async (imagePath, lang = 'eng') => {
  const langCode = SUPPORTED_LANGUAGES[lang] ? lang : 'eng';
  return new Promise((resolve, reject) => {
    ocrQueue.push({ imagePath, langCode, resolve, reject });
    dequeueOcr();
  });
};

exports.batchExtract = async (imagePaths, lang = 'eng') => {
  const promises = imagePaths.map(path => exports.extractText(path, lang));
  return Promise.all(promises);
};

exports.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
