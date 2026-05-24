# PDF-AI Scanner - Complete Setup & Fixes Guide

## ✅ FIXES IMPLEMENTED

### 1. **Image Upload - ALL Extensions Supported**
- Updated `backend/middleware/upload.js` to support 50+ image formats
- Supported formats include: JPG, JPEG, PNG, GIF, BMP, TIFF, WebP, SVG, HEIC, HEIF, AVIF, JP2, and many more
- MIME type fallback for better compatibility
- Updated file validators to accept images by both extension and MIME type

### 2. **Ollama AI Integration for PDF Editing**
- `backend/services/ollamaService.js` is fully implemented
- Automatically uses Ollama when available at `http://localhost:11434`
- Falls back to rule-based parser if Ollama is unavailable
- Supports natural language commands like "delete page 1", "rotate all", "compress file"

### 3. **Mobile Responsiveness (200px and above)**
- Added ultra-small screen optimizations in `frontend/src/index.css`
- Responsive breakpoints: 768px (tablet), 480px, 360px, 300px, 240px, 200px
- All components use relative sizing with `clamp()` functions
- Buttons, inputs, and cards automatically scale down for small screens
- Navigation properly hides/shows elements based on screen size

### 4. **Feature-Specific Mobile Fixes**

#### Scanner Workspace (Mobile)
- Responsive image upload grid
- Touch-friendly scan mode selector
- Mobile-optimized enhancement controls
- Proper handling of image previews on small screens

#### Document Editor (Mobile)
- Touch support for page annotations
- Drag-to-reorder pages works on mobile (touch events)
- Responsive toolbar with responsive button sizes
- Password input field adapts to screen size

#### AI Editor (Mobile)
- Voice input works on mobile with proper microphone access
- Chat messages properly formatted on small screens
- File upload supports all image formats
- Touch-friendly buttons and controls

#### Files Page (Mobile)
- Grid/List view toggle
- Responsive file grid layout
- Batch selection works on touch devices
- Floating action bar for selected items

### 5. **All Components Working**

#### Features Tested & Working:
✅ User Authentication (Login/Register)
✅ Document Scanner (Image upload & processing)
✅ OCR Text Extraction
✅ PDF Merge functionality
✅ PDF Compress
✅ Page Rotation
✅ Watermark addition
✅ Document sharing
✅ File management (Delete, Rename, Download)
✅ Document editing
✅ Page annotations
✅ AI-powered commands (with Ollama)
✅ Dashboard statistics
✅ Settings management

---

## 🚀 HOW TO RUN

### Prerequisites
- Node.js >= 18.0.0
- MongoDB running locally or connection string in `.env`
- Ollama (optional, for AI features)

### Installation

```bash
# Install all dependencies
npm run install:all

# Or separately:
npm install --prefix backend
npm install --prefix frontend
```

### Environment Setup

Create `.env` file in the root or `backend` directory:

```env
# Server
PORT=5000
NODE_ENV=development
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Database
MONGODB_URI=mongodb://localhost/pdfai

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Ollama AI (Optional - for AI editing)
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# File Upload
ALLOWED_FILE_TYPES=jpeg,jpg,png,gif,bmp,tiff,tif,webp,svg,svgz,ico,heic,heif,avif,jfif,pjpeg,apng,jp2,j2k,jpf,jpx,jpm,mj2,dds,eps,hdr,pic,pict,psd,raw,xbm,xpm,pcx,dcx,flif,bpg,ktx,pkm,astc,ppm,pgm,pbm,pnm,exif,exr,jpe,bmp2,dib,pdf
```

### Running the Application

#### Option 1: Development Mode (Separate terminals)

**Terminal 1 - Backend:**
```bash
npm run dev:backend
# Backend runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
# Frontend runs on http://localhost:3000
```

#### Option 2: Production Build

```bash
# Build frontend
npm run build

# Start backend (uses built frontend)
npm start
```

### Optional: Enable AI Features with Ollama

#### Install Ollama
- Download from https://ollama.ai
- Run: `ollama serve` (keeps it running)

#### Pull a model (first time only)
```bash
ollama pull llama2
```

The app will automatically detect and use Ollama if it's running!

---

## 📱 MOBILE TESTING

### Test on Different Screen Sizes:
- **Desktop**: 1920px, 1440px, 1024px
- **Tablet**: 768px, 834px
- **Mobile**: 480px, 414px, 375px
- **Small**: 320px, 280px, **200px** ← Ultra-small support

### Using Chrome DevTools:
1. Press `F12` to open DevTools
2. Click device toggle icon (top-left)
3. Select different devices or set custom dimensions
4. Test all features at each breakpoint

### Test on Real Device:
```bash
# Find your computer's IP
ipconfig getifaddr en0  # macOS/Linux
ipconfig             # Windows - look for IPv4 Address

# Access from phone:
http://YOUR_IP:3000
```

---

## 🎤 VOICE INPUT (AI Editor)

### How to Use:
1. Go to AI Editor (`/tools/ai`)
2. Upload a PDF
3. Click the microphone icon or press `Alt+V`
4. Speak a command like:
   - "Delete page 1"
   - "Rotate all 90 degrees"
   - "Compress this file"
   - "Add watermark saying draft"
5. Command is processed by Ollama or fallback parser

### Requires:
- Microphone permission (browser will ask)
- For AI features: Ollama must be running

---

## 🔧 TROUBLESHOOTING

### Images Not Uploading
✅ Solution: Ensure `backend/middleware/upload.js` has the comprehensive extension list (done)
- Check `ALLOWED_FILE_TYPES` in `.env`
- Verify file size < 10MB (or adjust MAX_FILE_SIZE)

### Ollama Commands Not Working
✅ Solution: 
- Start Ollama: `ollama serve`
- Pull model: `ollama pull llama2`
- Check OLLAMA_API_URL is correct in `.env`
- Falls back to rule-based parser if Ollama unavailable

### Mobile Layout Issues
✅ Solution:
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Test in Chrome DevTools device emulation

### Authentication Not Working
✅ Solution:
- Check MongoDB is running: `mongod`
- Verify JWT_SECRET in `.env`
- Check MONGODB_URI points to correct database

### OCR Not Extracting Text
✅ Solution:
- Install Tesseract.js dependencies
- Check image quality (low contrast images are harder)
- Ensure OCR is enabled in scan settings

---

## 📊 DATABASE MODELS

### Collections:
- **users**: User accounts and authentication
- **scans**: Scanned documents with OCR data
- **documents**: Uploaded PDFs
- **shares**: Document sharing tokens
- **jobs**: Background processing jobs

---

## 🔐 SECURITY NOTES

- Passwords are bcrypt hashed
- JWT tokens have 7-day expiration
- CORS is enabled for localhost only
- File uploads are validated
- User data is isolated per user

---

## 💡 TIPS FOR BEST PERFORMANCE

1. **Compress PDFs** before uploading (under 5MB ideal)
2. **Use modern browsers** (Chrome, Firefox, Safari, Edge)
3. **Enable hardware acceleration** in browser settings
4. **On mobile**: Close other apps for better performance
5. **For OCR**: Ensure good image quality (well-lit, clean)

---

## 🚀 FEATURES SHOWCASE

### Dashboard
- File statistics
- Recent files
- Quick actions

### Scanner
- Multiple image upload
- OCR text extraction
- Scan mode selection (Color/Grayscale/B&W)
- Image enhancement controls
- Real-time preview

### PDF Tools
- **AI Editor**: Natural language commands (with Ollama)
- **Merge PDFs**: Combine multiple documents
- **Document Editor**: Annotate, rotate, delete pages
- **Page Tools**: Crop, enhance, redact

### File Management
- Grid/List view
- Search & filter
- Batch operations
- Favorites
- Document sharing
- Version history

### Settings
- Profile management
- Preferences
- Security settings

---

## 📝 API ENDPOINTS

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Files
- `GET /api/files` - List user files
- `DELETE /api/files/:id` - Delete file
- `GET /api/files/:id/download` - Download file
- `PUT /api/files/:id` - Rename file

### Scans
- `POST /api/scans` - Create new scan
- `GET /api/scans/:id` - Get scan details
- `POST /api/scans/merge` - Merge scans
- `POST /api/scans/:id/split` - Split pages

### PDF Tools
- `POST /api/pdf/ai-edit` - AI-powered editing
- `GET /api/pdf/job/:id` - Job status
- `POST /api/pdf/merge` - Merge PDFs
- `POST /api/pdf/analyze` - Analyze document

---

## 🎯 NEXT STEPS

1. ✅ All extensions supported for images
2. ✅ Ollama integration ready
3. ✅ Mobile responsive down to 200px
4. ✅ All features working on mobile and desktop

**Start the app and test all features!**

```bash
npm run dev:backend  # Terminal 1
npm run dev:frontend # Terminal 2
```

Access: http://localhost:3000

---

## 📞 SUPPORT

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors (F12)
3. Check backend logs for API issues
4. Verify all dependencies are installed
5. Ensure .env file is correctly configured

---

**Happy scanning! 📄✨**
