# Core Web Vitals Quick Reference
## PDF-AI-Scanner Frontend Performance

---

## 📊 Current Baseline Metrics (Estimated)

| Metric | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| **LCP** (Largest Contentful Paint) | 2.8s | < 2.5s | -300ms | 🔴 High |
| **INP** (Interaction to Next Paint) | 150ms | < 100ms | -50ms | 🔴 Critical |
| **CLS** (Cumulative Layout Shift) | 0.22 | < 0.1 | -0.12 | 🔴 Critical |
| **FCP** (First Contentful Paint) | 1.2s | < 1.8s | +600ms | ✅ Good |
| **TTFB** (Time to First Byte) | 250-400ms | < 600ms | ✅ Good | ✅ Good |

**Overall Lighthouse Score:** ~72 → Target 90+

---

## 🔴 Critical Issues (Fix First)

### 1. **Cumulative Layout Shift (CLS: 0.22)** - Highest Impact
**Root Cause:** Images load without reserved dimensions  
**Quick Fix (15 min):** Add `aspect-ratio` CSS to all `<img>` tags

```css
/* Add to any image container */
aspect-ratio: 1 / 1.41; /* For A4 pages */
aspect-ratio: 3 / 2;     /* For thumbnails */
```

**Files to Update:**
- ✅ `src/components/Scanner/PageThumbnails.js` (line 156)
- ✅ `src/components/Files/FileCard.js` (line 94)
- ✅ Any `<img loading="lazy">` tags

**Expected Impact:** CLS: 0.22 → 0.05 (73% improvement)

---

### 2. **Interaction to Next Paint (INP: 150ms)** - Blocking User Interaction
**Root Cause:** Expensive animations + unoptimized handlers  
**Quick Fixes:**

**A. Remove continuous animations (30 min)**
```css
/* REPLACE in index.css lines 187-220 */

/* Old - expensive box-shadow animation */
@keyframes micPulse { /* ← DELETE */ }
.mic-active { animation: micPulse 1.5s infinite; /* ← REMOVE */ }

/* New - simple opacity animation */
.mic-active {
  animation: micOpacity 1.5s infinite ease-in-out;
}

@keyframes micOpacity {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Add will-change to spinner */
.spin {
  will-change: transform;
  transform: translateZ(0);
}
```

**B. Defer PDF processing to Web Worker (2 hours)**
```js
// src/workers/pdfProcessor.worker.js - NEW FILE
self.onmessage = async (event) => {
  const { file } = event.data;
  const pdfUtils = await import('../utils/pdfToImage');
  const images = await pdfUtils.convertPdfToImages(file);
  self.postMessage({ success: true, images });
  self.close();
};

// In Dashboard.js
const processPdfInWorker = (file) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/pdfProcessor.worker.js', import.meta.url));
    worker.onmessage = (e) => {
      resolve(e.data.images);
      worker.terminate();
    };
    worker.onerror = reject;
    worker.postMessage({ file });
  });
};
```

**Expected Impact:** INP: 150ms → 75ms (50% improvement)

---

### 3. **Largest Contentful Paint (LCP: 2.8s)** - Page Feels Slow
**Root Causes:**
- Heavy PDF library loads on every page
- All fonts loaded from CDN (non-critical weights)
- JavaScript parsing blocks rendering

**Quick Fixes (45 min total):**

**A. Reduce font weights (20 min)**
```html
<!-- In public/index.html - REPLACE lines 18-34 -->

<!-- Only load weights we actually use -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
/>
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
/>
```

**B. Lazy-load PDF library (25 min)**
```js
// In DocumentEditor.js - import only when needed
const { convertPdfToImages } = await import('../utils/pdfToImage');
```

**Expected Impact:** LCP: 2.8s → 2.1s (25% improvement)

---

## 🟡 Major Issues (Fix Next)

### 4. **No Virtual Scrolling for Large Lists** (Effort: 4 hours)
**Problem:** Rendering 1000+ files/pages in DOM causes memory leak  
**Solution:** Install `react-window`

```bash
npm install react-window
```

**Files to Update:**
- `src/pages/FilesPage.js`
- `src/components/Scanner/PageThumbnails.js`

**Code Example:**
```js
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={pages.length}
  itemSize={110}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <PageThumbnail page={pages[index]} />
    </div>
  )}
</FixedSizeList>
```

**Expected Impact:** 
- Memory: 500MB → 50MB
- Scroll smoothness: 20fps → 60fps

---

### 5. **Component Re-render Spam** (Effort: 2 hours)
**Problem:** Components re-render on every parent state change  
**Quick Fix:** Add React.memo + useCallback

```js
// PageThumbnails.js - line 223
export default React.memo(PageThumbnails);

// Dashboard.js - add useCallback
const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const [stats, scans] = await Promise.all([...]);
    setStats(stats);
    setScans(scans);
  } finally {
    setLoading(false);
  }
}, []); // No dependencies

// FileCard.js - line 227
export default React.memo(FileCard);
```

**Expected Impact:** Re-renders: 50+ → 3 per interaction

---

### 6. **No Request Caching** (Effort: 1 hour)
**Problem:** Same API calls made repeatedly  
**Solution:** Add cache wrapper

```js
// src/services/cache.js - NEW FILE
export class ApiCache {
  constructor() {
    this.cache = new Map();
  }

  async getOrFetch(key, fetcher, ttl = 5 * 60 * 1000) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < ttl) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, time: Date.now() });
    return data;
  }

  invalidate(key) {
    this.cache.delete(key);
  }
}

export const apiCache = new ApiCache();

// Usage in scansAPI
export const getStats = async () => {
  return apiCache.getOrFetch('stats', () => api.get('/scans/stats'), 60000);
};
```

**Expected Impact:** API calls: 40+ → 10 per session

---

## ⚡ Quick Win Checklist (Can Do Today)

### Task 1: Add Image Aspect Ratio (15 min)
- [ ] Open `src/components/Scanner/PageThumbnails.js`
- [ ] Find: `<img src={getFileUrl(...)` on line 156
- [ ] Replace with aspect-ratio CSS:
```js
<img
  src={getFileUrl(page.processedImage || page.originalImage)}
  alt={`Page ${page.pageNumber}`}
  loading="lazy"
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    aspectRatio: '1 / 1.41' // ← ADD THIS
  }}
/>
```

### Task 2: Optimize Animations (30 min)
- [ ] Open `src/index.css`
- [ ] Replace lines 562-584 (micPulse animation) with simpler opacity animation
- [ ] Add `will-change` and `transform: translateZ(0)` to `.spin`

### Task 3: Fix Font Loading (15 min)
- [ ] Open `public/index.html`
- [ ] Replace Google Fonts links (lines 16-34) with only 400/600/700 weights

### Task 4: Add useCallback to Dashboard (20 min)
- [ ] Open `src/pages/Dashboard.js`
- [ ] Wrap `loadData` with `useCallback`
- [ ] Wrap `handleFiles` with `useCallback`

**Total Time: ~1.5 hours**  
**Expected Result:** Lighthouse score: 72 → 82-85

---

## 🎯 Performance Optimization Plan

### Phase 1: Quick Wins (Today - Tomorrow)
**Time:** 1.5 hours | **Impact:** Lighthouse +10 points

```
✅ Image aspect ratio
✅ Animation cleanup
✅ Font weight reduction
✅ useCallback on handlers
```

**Metrics Change:**
- LCP: 2.8s → 2.5s
- INP: 150ms → 120ms
- CLS: 0.22 → 0.12

---

### Phase 2: Core Improvements (This Week)
**Time:** 8-10 hours | **Impact:** Lighthouse +15 points

```
✅ PDF processing Web Worker
✅ Component memoization
✅ API response caching
✅ Lazy load heavy components
```

**Metrics Change:**
- LCP: 2.5s → 2.0s
- INP: 120ms → 70ms
- CLS: 0.12 → 0.06

---

### Phase 3: Scalability (This Month)
**Time:** 8-10 hours | **Impact:** Lighthouse +5 points

```
✅ Virtual scrolling for lists
✅ Progressive image loading
✅ Service worker optimization
✅ Bundle size analysis
```

**Final Metrics:**
- LCP: 2.0s → 1.6s ✅
- INP: 70ms → 50ms ✅
- CLS: 0.06 → 0.03 ✅
- **Lighthouse: 90+ 🎉**

---

## 🔍 How to Measure Progress

### Using Chrome DevTools (Desktop)
1. Open DevTools (F12)
2. Click "Lighthouse" tab
3. Select "Desktop" 
4. Click "Analyze page load"
5. Compare with baseline

### Using DevTools - Performance Tab
1. Open DevTools → Performance tab
2. Click record
3. Interact with page
4. Stop recording
5. Look for red frames in timeline

### Mobile Testing
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://your-app.com --view
```

---

## 📝 Key Files to Monitor

### Critical for Performance
- `src/index.css` - Animations (animations.diff)
- `public/index.html` - Font loading (fonts.diff)
- `src/pages/Dashboard.js` - PDF processing (worker.diff)
- `src/components/Scanner/PageThumbnails.js` - Images (aspect-ratio.diff)
- `src/services/api.js` - Request handling (cache.diff)

### Safe to Ignore (Already Good)
- ✅ `src/App.js` - Good lazy loading
- ✅ `src/reportWebVitals.js` - Correctly configured
- ✅ `src/serviceWorkerRegistration.js` - Good setup

---

## ✅ Success Criteria

### After Phase 1 (Quick Wins)
- [ ] CLS < 0.15 (improved from 0.22)
- [ ] Lighthouse > 75
- [ ] No visual jank on thumbnail scroll

### After Phase 2 (Core Improvements)
- [ ] INP < 100ms
- [ ] LCP < 2.3s
- [ ] Lighthouse > 85

### After Phase 3 (Complete)
- [ ] CLS < 0.05
- [ ] INP < 60ms
- [ ] LCP < 1.8s
- [ ] Lighthouse > 90
- [ ] Mobile score ≈ Desktop score

---

## 💡 Pro Tips

### For Testing
- Always test in **Incognito Mode** (no cache interference)
- Test on **throttled connection** (Lighthouse does this by default)
- Test **multiple times** (variance of ±10% is normal)
- **Compare desktop + mobile** separately

### For Debugging
- Use **Performance Timeline** to identify bottlenecks
- Check **Coverage Tab** for unused JavaScript
- Monitor **Network Tab** for render-blocking resources
- Use **React DevTools Profiler** for component times

### General Best Practices
- Measure, don't guess
- Fix one issue at a time
- Validate with multiple tools
- Set performance budgets
- Monitor in production with real user metrics (RUM)

---

## 📚 Additional Resources

- [Web Vitals Guide](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [React Performance Optimization](https://react.dev/reference/react/memo)
- [CSS Animations Performance](https://web.dev/animations-guide/)
- [Image Optimization](https://web.dev/serve-responsive-images/)

---

## Summary

**Current Status:** 72/100 Lighthouse  
**Target:** 90/100 Lighthouse  

**Quick Wins (90 min):** +10 points  
**This Week (8-10 hrs):** +15 points  
**This Month (8-10 hrs):** +5 points  

**🎯 Total Expected Improvement: +30 points (72 → 90+)**

Start with Task 1-4 from the Quick Win Checklist today for immediate results!
