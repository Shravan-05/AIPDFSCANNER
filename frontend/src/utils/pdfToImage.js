import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Initialize the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs`;

export const convertPdfToImages = async (file) => {
  const images = [];
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  // Process in batches to avoid crashing the browser tab with too many canvases
  const CONCURRENCY = 5;
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && i + j <= numPages; j++) {
      const pageNum = i + j;
      batch.push((async () => {
        const page = await pdf.getPage(pageNum);
        const scale = 2.0; 
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        // Export as JPEG to shrink file size dramatically (often 10x smaller than PNG)
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        
        return new File([blob], `${file.name.replace('.pdf', '')}_page_${pageNum}.jpg`, {
          type: 'image/jpeg'
        });
      })());
    }
    
    // Wait for the current batch to finish
    const batchResults = await Promise.all(batch);
    images.push(...batchResults);
  }
  
  return images;
};
