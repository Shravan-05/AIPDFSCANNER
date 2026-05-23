const { PDFDocument, degrees, rgb } = require('pdf-lib');

class PdfActionEngine {
  async execute(pdfBuffer, actions) {
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Execute sequentially
    for (const action of actions) {
      const numPages = pdfDoc.getPageCount();

      if (action.type === 'DELETE_PAGES') {
        let pagesToDelete = [];
        if (action.parameters.pages === 'all') {
          // Deleting all pages: leave the first page since a PDF must contain at least 1 page
          for (let i = 2; i <= numPages; i++) {
            pagesToDelete.push(i);
          }
        } else if (Array.isArray(action.parameters.pages)) {
          pagesToDelete = action.parameters.pages;
        }

        // Sort descending so indices don't shift
        const indicesToDelete = pagesToDelete
          .map(p => p - 1) // 1-indexed to 0-indexed
          .filter(p => p >= 0 && p < numPages)
          .sort((a, b) => b - a);
        
        for (const idx of indicesToDelete) {
          if (pdfDoc.getPageCount() > 1) {
            pdfDoc.removePage(idx);
          }
        }
      }

      if (action.type === 'ROTATE_PAGES') {
        if (action.parameters.pages === 'all') {
          const pages = pdfDoc.getPages();
          pages.forEach(p => p.setRotation(degrees(action.parameters.degree)));
        } else {
          const pagesToRotate = action.parameters.pages
            .map(p => p - 1)
            .filter(p => p >= 0 && p < numPages);
          
          for (const idx of pagesToRotate) {
            const page = pdfDoc.getPage(idx);
            page.setRotation(degrees(action.parameters.degree));
          }
        }
      }

      if (action.type === 'EXTRACT_PAGES') {
        const pagesToExtract = action.parameters.pages
          .map(p => p - 1)
          .filter(p => p >= 0 && p < numPages);
          
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(pdfDoc, pagesToExtract);
        copiedPages.forEach(p => newDoc.addPage(p));
        return await newDoc.save(); // Early return for extraction
      }

      if (action.type === 'ADD_WATERMARK') {
        const pages = pdfDoc.getPages();
        pages.forEach(page => {
          const { width, height } = page.getSize();
          page.drawText(action.parameters.text, {
            x: width / 4,
            y: height / 2,
            size: 50,
            color: rgb(0.95, 0.1, 0.1),
            rotate: degrees(45),
            opacity: 0.3
          });
        });
      }
      
      if (action.type === 'REDACT_TEXT') {
        const pagesToRedact = action.parameters.pages === 'all' 
          ? pdfDoc.getPages() 
          : action.parameters.pages.map(p => pdfDoc.getPage(p - 1)).filter(Boolean);
          
        pagesToRedact.forEach(page => {
          const { width, height } = page.getSize();
          let yOffset = height - 100; // default top
          let rectHeight = 100;
          
          if (action.parameters.position === 'bottom') {
            yOffset = 0;
          } else if (action.parameters.position === 'half') {
            yOffset = height / 2;
            rectHeight = height / 2;
          }

          page.drawRectangle({
            x: 0,
            y: yOffset,
            width: width,
            height: rectHeight,
            color: rgb(0, 0, 0),
          });
        });
      }

      if (action.type === 'ADD_TEXT') {
        const pagesToStamp = action.parameters.pages === 'all' 
          ? pdfDoc.getPages() 
          : action.parameters.pages.map(p => pdfDoc.getPage(p - 1)).filter(Boolean);
          
        pagesToStamp.forEach(page => {
          const { width, height } = page.getSize();
          page.drawText(action.parameters.text, {
            x: width / 2 - 50, // center-ish
            y: height - 50, // top margin
            size: 24,
            color: rgb(0.2, 0.2, 0.8),
          });
        });
      }

      if (action.type === 'DUPLICATE_PAGES') {
        const sourcePages = (action.parameters.pages || [])
          .map(p => p - 1)
          .filter(p => p >= 0 && p < pdfDoc.getPageCount());

        if (sourcePages.length > 0) {
          const copiedPages = await pdfDoc.copyPages(pdfDoc, sourcePages);
          copiedPages.forEach(page => pdfDoc.addPage(page));
        }
      }

      if (action.type === 'SPLIT_PDF') {
        let splitIndex = 1;
        if (action.parameters.afterPage === 'half') {
          splitIndex = Math.floor(numPages / 2);
        } else {
          splitIndex = action.parameters.afterPage || 1;
        }
        
        if (splitIndex > 0 && splitIndex < numPages) {
          // Create two documents, but since our API returns one download right now, 
          // we'll return the SECOND half as the result.
          const pagesToExtract = [];
          for (let i = splitIndex; i < numPages; i++) {
            pagesToExtract.push(i);
          }
          const newDoc = await PDFDocument.create();
          const copiedPages = await newDoc.copyPages(pdfDoc, pagesToExtract);
          copiedPages.forEach(p => newDoc.addPage(p));
          return await newDoc.save(); // Early return
        }
      }
      
      if (action.type === 'COMPRESS') {
        // Saving using object streams compresses structures and streams.
        action.parameters.shouldCompress = true;
      }

      if (action.type === 'DELETE_BLANK_PAGES') {
        const pagesToDelete = [];
        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const contents = page.node.Contents();
          if (!contents || contents.length === 0) {
            pagesToDelete.push(i);
            continue;
          }
          
          try {
            const stream = page.node.getContents();
            if (!stream || stream.length === 0) {
              pagesToDelete.push(i);
              continue;
            }
            const streamText = Buffer.concat(stream.map(s => s.contents)).toString();
            // Check for standard PDF drawing and text operators:
            // Do = Image/Form, Tj/TJ = Text, re = Rect, m/l = Path
            const hasDrawing = /[\b\s](?:m|l|re|Do|Tj|TJ)[\b\s]/.test(streamText);
            if (!hasDrawing) {
              pagesToDelete.push(i);
            }
          } catch (e) {
            console.error(`Error checking page ${i + 1} for blank state:`, e);
          }
        }

        // Sort descending so indices don't shift when deleting
        const indicesToDelete = pagesToDelete.sort((a, b) => b - a);
        for (const idx of indicesToDelete) {
          if (pdfDoc.getPageCount() > 1) {
            pdfDoc.removePage(idx);
          }
        }
      }
    }

    // Save with stream compression if COMPRESS was requested
    const hasCompress = actions.some(a => a.type === 'COMPRESS');
    return await pdfDoc.save({ useObjectStreams: hasCompress });
  }
}

module.exports = new PdfActionEngine();
