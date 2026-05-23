const { generatePdf } = require('./services/pdfGenerator');
const path = require('path');
const fs = require('fs');

async function test() {
  try {
    const uploadDir = './uploads';
    const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.png') && !f.includes('_'));
    if (files.length === 0) { console.log('No source images found'); return; }
    
    const pages = [{
      processedImage: path.join(uploadDir, files[0]),
      originalImage: path.join(uploadDir, files[0]),
      ocrText: 'Test OCR text'
    }];
    
    console.log('Testing PDF generation with:', pages[0].processedImage);
    console.log('File exists:', fs.existsSync(pages[0].processedImage));
    
    const result = await generatePdf(pages, { title: 'Test', quality: 'standard' });
    console.log('PDF generated at:', result);
    console.log('PDF size:', fs.statSync(result).size);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
