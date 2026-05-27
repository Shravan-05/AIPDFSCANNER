import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, Send, Bot, User, FileText, Loader, Download,
  Mic, MicOff, Volume2, VolumeX, Sparkles, Zap,
  ChevronRight, ChevronLeft, RotateCcw, RotateCw, Trash2, CheckCircle2, AlertCircle, PlayCircle
} from 'lucide-react';
import PdfPreview from '../components/UI/PdfPreview';
import pdfToolsAPI from '../services/pdfToolsAPI';
import { filesAPI } from '../services/api';
import { showToast } from '../components/UI/Toast';
import api from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { label: '\u{1F5DC}\uFE0F Make smaller',          command: 'compress this file' },
  { label: '\u{1F5D1}\uFE0F Delete page 1',          command: 'delete page 1' },
  { label: '\u{1F504} Rotate all 90\u00B0',         command: 'rotate all pages 90 degrees' },
  { label: '\u{2702}\uFE0F Split in half',           command: 'split in half' },
  { label: '\u{1F4A7} Add watermark',           command: "watermark saying 'CONFIDENTIAL'" },
  { label: '\u{2B1B} Redact top of page 1',    command: 'redact the top of page 1' },
];

// ─── Chat Bubble Component ────────────────────────────────────────────────────
const ChatBubble = React.memo(({ msg }) => {
  const isAI = msg.sender === 'ai';
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      flexDirection: isAI ? 'row' : 'row-reverse',
      animation: 'fadeSlideIn 0.25s ease'
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isAI ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid var(--border-color)', marginTop: 2
      }}>
        {isAI
          ? <Bot size={16} color="#fff" />
          : <User size={16} color="var(--text-secondary)" />}
      </div>

      {/* Bubble */}
      <div style={{
        background: isAI ? 'var(--bg-secondary)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        color: isAI ? 'var(--text-primary)' : '#fff',
        padding: '10px 14px',
        borderRadius: 14,
        borderTopLeftRadius: isAI ? 4 : 14,
        borderTopRightRadius: isAI ? 14 : 4,
        fontSize: 13.5, lineHeight: 1.5,
        maxWidth: '85%',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-color)'
      }}>
        {/* NLP metadata strip */}
        {isAI && msg.intent && msg.intent !== 'GREETING' && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7,
            paddingBottom: 6, borderBottom: '1px solid var(--border-color)'
          }}>
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
              background: 'rgba(99,102,241,0.12)', color: '#6366f1',
              padding: '2px 6px', borderRadius: 4
            }}>
              ⚡ {msg.intent}
            </span>
            {msg.confidence != null && (
              <span style={{
                fontSize: 9.5, fontWeight: 600,
                background: 'rgba(16,185,129,0.10)', color: '#10b981',
                padding: '2px 6px', borderRadius: 4
              }}>
                {Math.round(msg.confidence * 100)}% confident
              </span>
            )}
            {msg.entities?.pages?.length > 0 && (
              <span style={{
                fontSize: 9.5, fontWeight: 600,
                background: 'rgba(245,158,11,0.10)', color: '#f59e0b',
                padding: '2px 6px', borderRadius: 4
              }}>
                pages: {msg.entities.pages.join(', ')}
              </span>
            )}
          </div>
        )}
        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
      </div>
    </div>
  );
});

// ─── Canvas Soundwave Visualizer ──────────────────────────────────────────────
const CanvasWaveform = React.memo(({ isListening }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!isListening) {
      if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2.5;

      const waves = [
        { color: 'rgba(99, 102, 241, 0.85)', amp: 12, speed: 0.08 },
        { color: 'rgba(168, 85, 247, 0.55)', amp: 7, speed: 0.05 },
        { color: 'rgba(236, 72, 153, 0.35)', amp: 4, speed: 0.12 }
      ];

      for (let i = 0; i < waves.length; i++) {
        const wave = waves[i];
        ctx.strokeStyle = wave.color;
        ctx.shadowColor = wave.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * 0.045 + phase * wave.speed) * wave.amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      phase += 1;
      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isListening]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={28}
      style={{ display: 'block', background: 'transparent', width: 120, height: 28 }}
    />
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────
const AiEditor = () => {
  const navigate = useNavigate();

  // Multi-document management state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeFile, setActiveFile]       = useState(null);
  const [activeUrl, setActiveUrl]         = useState(null);
  const [docClassification, setDocClassification] = useState({ type: 'document', suggestions: [] });
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Undo / Redo stacks
  const [historyStack, setHistoryStack]   = useState([]);
  const [historyIndex, setHistoryIndex]   = useState(-1);

  // Job Queue Polling state
  const [currentJobId, setCurrentJobId]   = useState(null);
  const [jobProgress, setJobProgress]     = useState(0);
  const [jobStep, setJobStep]             = useState('');
  const [jobTimeline, setJobTimeline]     = useState([]);

  // Chat Feed state
  const [messages, setMessages]       = useState([{
    sender: 'ai',
    text: "👋 Hello! I'm your AI PDF Document Agent. Upload one or more PDFs then speak or type any command. I understand natural language!\n\nTry saying: \"delete page 1, add a watermark saying draft, then compress\"",
    intent: 'GREETING', confidence: 1.0
  }]);
  const [inputCommand, setInputCommand] = useState('');
  const [processing, setProcessing]     = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [autoSubmit, setAutoSubmit]     = useState(false);
  const [ttsEnabled, setTtsEnabled]     = useState(true);
  const [inputMode, setInputMode]       = useState('text');

  const fileInputRef    = useRef(null);
  const messagesEndRef  = useRef(null);
  const recognitionRef  = useRef(null);
  const recognitionStateRef = useRef('idle');
  const manualStopRef = useRef(false);
  const inputRef        = useRef(null);
  const pollingRef      = useRef(null);
  const objectUrlsRef   = useRef([]);

  // Check Ollama connection status on mount
  useEffect(() => {
    const checkOllama = async () => {
      try {
        const { data } = await api.get('/health');
        const dot = document.getElementById('ollama-status-dot');
        if (dot) {
          const isAvailable = data?.ollama?.available;
          dot.style.background = isAvailable ? '#10b981' : '#f59e0b';
          dot.title = isAvailable ? 'Ollama connected' : 'Ollama unavailable (using fallback)';
        }
      } catch {
        const dot = document.getElementById('ollama-status-dot');
        if (dot) {
          dot.style.background = '#ef4444';
          dot.title = 'Ollama connection check failed';
        }
      }
    };
    checkOllama();
  }, []);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Object URL Cleanup ─────────────────────────────────────────────────────
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => { urls.forEach(u => { try { URL.revokeObjectURL(u); } catch (_) {} }); };
  }, []);

  const trackUrl = useCallback((url) => {
    if (url && url.startsWith('blob:')) {
      objectUrlsRef.current = [...objectUrlsRef.current.filter(u => u !== url), url];
    }
    return url;
  }, []);

  // ── Polling Cleanup ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // ── Speech Recognition setup ─────────────────────────────────────────────────
  const autoSubmitRef = useRef(autoSubmit);
  autoSubmitRef.current = autoSubmit;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous    = true;
    rec.interimResults = true;
    rec.lang          = 'en-US';

    rec.onstart = () => {
      recognitionStateRef.current = 'listening';
      manualStopRef.current = false;
      setIsListening(true);
      setInputMode('voice');
    };
    rec.onend = () => {
      recognitionStateRef.current = 'idle';
      setIsListening(false);
    };

    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript).join(' ').replace(/\s+/g, ' ').trim();
      setInputCommand(transcript);

      if (event.results[event.results.length - 1].isFinal) {
        const final = transcript;
        setInputCommand(final);

        const TRIGGERS = ['send it', 'execute now', 'do it', 'run command', 'send document'];
        const lc = final.toLowerCase();
        const hit = TRIGGERS.find(t => lc.endsWith(t));

        if (hit) {
          const cmd = final.slice(0, final.length - hit.length).trim();
          if (cmd) { setInputCommand(cmd); setTimeout(() => doSubmit(cmd, 'voice'), 300); }
        } else if (autoSubmitRef.current && !manualStopRef.current) {
          setTimeout(() => doSubmit(final, 'voice'), 500);
        }
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed')
        showToast.error('Microphone access denied. Enable mic in browser settings.');
      else if (e.error === 'no-speech')
        showToast.error('No speech detected.');
      recognitionStateRef.current = 'idle';
      setIsListening(false);
    };

    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch (_) {} };
  }, []);

  // ── Keyboard Shortcuts (Alt+V or Ctrl+Space) ─────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isAltV = e.altKey && e.code === 'KeyV';
      const isCtrlSpace = e.ctrlKey && e.code === 'Space';
      if (isAltV || isCtrlSpace) {
        e.preventDefault();
        toggleMic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[✅❌🤔🚀✍️⚡🎙️📊🔒🗜️👤📝🔍🔄🗑️]/g, '').trim();
    const utt   = new SpeechSynthesisUtterance(clean);
    utt.rate    = 1.05;
    utt.pitch   = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const best   = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
                || voices.find(v => v.lang.startsWith('en'));
    if (best) utt.voice = best;
    window.speechSynthesis.speak(utt);
  }, [ttsEnabled]);

  // ── History Push State ───────────────────────────────────────────────────────
  const pushToHistory = (file, url) => {
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push({ file, url });
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);
    setActiveFile(file);
    setActiveUrl(url);

    // Also update this file in the uploadedFiles collection
    setUploadedFiles(prev => prev.map(f => f.file.name === file.name ? { ...f, file, url } : f));
  };

  // ── Undo / Redo Handlers ─────────────────────────────────────────────────────
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = historyStack[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setActiveFile(prev.file);
      setActiveUrl(prev.url);
      showToast.success("Reverted last edit");
      speak("Undo performed");
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const next = historyStack[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setActiveFile(next.file);
      setActiveUrl(next.url);
      showToast.success("Re-applied last edit");
      speak("Redo performed");
    }
  };

  // ── Document Classification ─────────────────────────────────────────────────
  const classifyDocument = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await pdfToolsAPI.analyze(formData);
      
      if (res.data.success && res.data.classification) {
        const { type, suggestions } = res.data.classification;
        setDocClassification({ type, suggestions });
        
        // Announce classification in the chat
        const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
        const msg = `⚡ Document classified: **${capitalized}**. I have loaded smart contextual suggestions for you below!`;
        addAIMessage(msg, 'CLASSIFY_DOCUMENT', 0.95);
        speak(`${capitalized} detected. Smart suggestions loaded.`);
      }
    } catch (err) {
      console.error('Failed to classify document:', err);
    }
  };

  // ── File Upload ───────────────────────────────────────────────────────────────
  const processSelectedFiles = async (files) => {
    if (files.length === 0) return;

    const pdfs = files.filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) {
      showToast.error('Please upload valid PDF files.');
      return;
    }

    const newFiles = pdfs.map(f => {
      const url = URL.createObjectURL(f);
      trackUrl(url);
      return { file: f, url, id: Math.random().toString(36).substring(7) };
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Select the first uploaded PDF as active
    const primary = newFiles[0];
    setActiveFile(primary.file);
    setActiveUrl(primary.url);
    
    // Clear history stack and insert first baseline
    setHistoryStack([{ file: primary.file, url: primary.url }]);
    setHistoryIndex(0);

    const msg = `✅ Loaded "${primary.file.name}" (${(primary.file.size / 1024).toFixed(0)} KB). Analyzing document structure...`;
    addAIMessage(msg, 'FILE_LOADED', 1.0);
    speak(`Loaded ${primary.file.name}. Analyzing.`);

    // Classify the PDF (fire-and-forget)
    classifyDocument(primary.file);

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleFileUpload = async (e) => {
    await processSelectedFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragActive(false);
    await processSelectedFiles(Array.from(e.dataTransfer.files || []));
  };

  // ── Switch Active PDF ────────────────────────────────────────────────────────
  const switchActiveFile = (fileObj) => {
    setActiveFile(fileObj.file);
    setActiveUrl(fileObj.url);
    
    // Reset history stack for this specific document
    setHistoryStack([{ file: fileObj.file, url: fileObj.url }]);
    setHistoryIndex(0);

    setMessages(prev => [...prev, {
      sender: 'ai',
      text: `🔄 Switched active file to **"${fileObj.file.name}"**. How can I help you edit it?`,
      intent: 'SWITCH_FILE',
      confidence: 1.0
    }]);
    speak(`Switched to ${fileObj.file.name}`);

    // Reclassify this document
    classifyDocument(fileObj.file);
  };

  // ── Delete File from tray ────────────────────────────────────────────────────
  const deleteUploadedFile = (id, e) => {
    e.stopPropagation();
    const target = uploadedFiles.find(f => f.id === id);
    if (!target) return;

    try { URL.revokeObjectURL(target.url); } catch (_) {}

    const remaining = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(remaining);

    if (activeFile?.name === target.file.name) {
      if (remaining.length > 0) {
        setActiveFile(remaining[0].file);
        setActiveUrl(remaining[0].url);
        setHistoryStack([{ file: remaining[0].file, url: remaining[0].url }]);
        setHistoryIndex(0);
      } else {
        setActiveFile(null);
        setActiveUrl(null);
        setHistoryStack([]);
        setHistoryIndex(-1);
      }
    }
    showToast.success(`Removed ${target.file.name}`);
  };

  const addAIMessage = (text, intent, confidence, extras = {}) => {
    setMessages(prev => [...prev, { sender: 'ai', text, intent, confidence, ...extras }]);
  };

  // ── Mic Toggle ────────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (!recognitionRef.current) {
      showToast.error('Speech Recognition not supported in this browser. Use Chrome or Edge.');
      return;
    }
    if (!activeFile) {
      showToast.error('Upload a PDF first, then speak!');
      return;
    }
    if (isListening) {
      manualStopRef.current = true;
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch (e) {
        recognitionStateRef.current = 'idle';
      }
    } else {
      setInputCommand('');
      if (recognitionStateRef.current !== 'idle') return;
      try {
        recognitionStateRef.current = 'starting';
        recognitionRef.current.start();
      } catch (e) {
        recognitionStateRef.current = 'idle';
        setIsListening(false);
        console.error('Mic start error', e);
      }
    }
  };

  // ── Background Job Polling ────────────────────────────────────────────────────
  const pollJobStatus = (jobId) => {
    setProcessing(true);
    setCurrentJobId(jobId);
    setJobProgress(5);
    setJobStep('Enqueueing background task...');

    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await pdfToolsAPI.getJobStatus(jobId);
        
        if (data.success) {
          setJobProgress(data.progress || 0);
          setJobStep(data.currentStep || 'Processing...');
          setJobTimeline(data.timeline || []);

          if (data.status === 'completed') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setCurrentJobId(null);
            setProcessing(false);

            showToast.success('AI execution completed successfully!');

            // Fetch the generated PDF using authentication download api
            const docId = data.result?.document?._id;
            if (docId) {
              const dlRes = await filesAPI.download(docId);
              const blob  = new Blob([dlRes.data], { type: 'application/pdf' });
              const newFile = new File([blob], data.result.document.originalFilename, { type: 'application/pdf' });
              
              pushToHistory(newFile, URL.createObjectURL(blob));
              addAIMessage(
                `✅ Done! Successfully executed your command. Document modified and updated.`,
                'EXECUTE_SUCCESS', 0.98,
                { inputMode: inputMode }
              );
              speak('Successfully executed. Document updated.');
            }
          } else if (data.status === 'failed') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setCurrentJobId(null);
            setProcessing(false);
            
            showToast.error(`Execution failed: ${data.error || 'Unknown error'}`);
            addAIMessage(`❌ Execution failed: ${data.error || 'Server error'}`, 'ERROR', 0);
            speak(`Sorry, that command failed.`);
          }
        }
      } catch (err) {
        console.error('Job status polling error:', err);
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setCurrentJobId(null);
        setProcessing(false);
        const statusMsg = err.response?.data?.msg || err.message || 'Unable to poll background job.';
        showToast.error(statusMsg);
        addAIMessage(`Job status unavailable: ${statusMsg}`, 'ERROR', 0);
        speak('I could not read the job status. Please try the command again.');
      }
    }, 2000);
  };

  // ── Core Submit Handler ───────────────────────────────────────────────────────
  const doSubmit = async (commandToSend, mode = 'text') => {
    const cmd = commandToSend.trim();
    if (!cmd || processing) return;
    if (!activeFile) {
      showToast.error('Please upload a PDF first!');
      return;
    }

    setMessages(prev => [...prev, { sender: 'user', text: cmd }]);
    setInputCommand('');

    const wantsTrayMerge = /\b(merge|combine|join|put .* together)\b/i.test(cmd)
      && uploadedFiles.length >= 2
      && !/\b(delete|remove|rotate|compress|split|extract|watermark|stamp|redact|ocr|enhance|crop)\b/i.test(cmd);
    if (wantsTrayMerge) {
      await handleMergeAllTray();
      setInputMode('text');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', activeFile);
      formData.append('command', cmd);
      formData.append('input_mode', mode);
      formData.append('doc_info', JSON.stringify({
        documentType: docClassification.type,
        uploadedFileCount: uploadedFiles.length,
        fileSize: activeFile.size
      }));

      const ctx = messages.slice(-6).map(m => ({
        sender: m.sender, text: m.text,
        intent: m.intent, confidence: m.confidence
      }));
      formData.append('history', JSON.stringify(ctx));

      setProcessing(true);
      const { data } = await pdfToolsAPI.aiEdit(formData);

      if (data.clarification) {
        setProcessing(false);
        addAIMessage(`🤔 ${data.msg}`, data.intent, data.confidence, { entities: data.entities });
        speak(data.msg);

      } else if (data.needs_confirmation) {
        setProcessing(false);
        addAIMessage(data.confirmation_message || 'This action needs confirmation before I run it.', data.intent, data.confidence, {
          actions: data.actions,
          entities: data.entities
        });
        speak(data.confirmation_message || 'Please confirm this action.');

      } else if (data.redirect) {
        setProcessing(false);
        addAIMessage(`🚀 ${data.msg}`, data.intent, data.confidence);
        speak(data.msg);
        setTimeout(() => {
          if (data.target === 'scanner') navigate('/scanner');
          else navigate('/editor/new');
        }, 1500);

      } else if (data.success && data.jobId) {
        // AI returned background JobId! Start polling status.
        pollJobStatus(data.jobId);
        const plan = data.actions?.map((a, idx) => `${idx + 1}. ${a.type}`).join('\n') || 'Action plan ready.';
        addAIMessage(`Action plan accepted.\n${plan}`, data.intent, data.confidence, {
          actions: data.actions,
          entities: data.entities
        });
        speak('Executing action plan.');

      } else {
        setProcessing(false);
        addAIMessage(`❌ ${data.msg || 'Could not parse command.'}`, 'ERROR', 0);
      }

    } catch (err) {
      setProcessing(false);
      console.error('AI Edit error:', err);
      const errMsg = err.response?.data?.msg || "Couldn't process that command. Try again.";
      addAIMessage(`❌ ${errMsg}`, 'ERROR', 0);
      speak(errMsg);
    } finally {
      setInputMode('text');
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    doSubmit(inputCommand, 'text');
  };

  const downloadCurrentPdf = () => {
    if (!activeUrl) return;
    const a = document.createElement('a');
    a.href = activeUrl;
    a.download = `AI_Edited_${activeFile?.name || 'document.pdf'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // ── Multi-file Merge action ──────────────────────────────────────────────────
  const handleMergeAllTray = async () => {
    if (uploadedFiles.length < 2) return;
    setProcessing(true);
    speak("Merging all uploaded PDFs");
    showToast.loading("Merging documents...");

    try {
      const formData = new FormData();
      uploadedFiles.forEach(f => {
        formData.append('files', f.file);
      });

      const res = await pdfToolsAPI.merge(formData);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const mergedFile = new File([blob], `Merged_Document_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      const newFiles = [...uploadedFiles, {
        file: mergedFile,
        url: URL.createObjectURL(blob),
        id: Math.random().toString(36).substring(7)
      }];
      setUploadedFiles(newFiles);
      
      // Focus merged PDF
      setActiveFile(mergedFile);
      setActiveUrl(URL.createObjectURL(blob));
      setHistoryStack([{ file: mergedFile, url: URL.createObjectURL(blob) }]);
      setHistoryIndex(0);

      addAIMessage("✅ Successfully merged all uploaded PDFs in your workspace tray!", "MERGE_PDF", 0.98);
      showToast.success("PDFs merged successfully!");
      classifyDocument(mergedFile);

    } catch (err) {
      console.error('Merge tray error:', err);
      showToast.error("Failed to merge tray PDFs");
    } finally {
      setProcessing(false);
    }
  };

  // ── Smart suggest chip select ────────────────────────────────────────────────
  const handleSmartChip = (cmd) => {
    setInputCommand(cmd);
    setTimeout(() => {
      doSubmit(cmd, 'text');
    }, 200);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="ai-editor-shell"
      onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        height: isMobile ? 'calc(100vh - 112px)' : 'calc(100vh - 96px)',
        gap: isMobile ? 8 : 20,
        overflow: 'hidden',
        position: 'relative',
        paddingBottom: isMobile && sidebarCollapsed ? 64 : 0
      }}
    >
      {isDragActive && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(10px)',
          border: '2px dashed #818cf8', borderRadius: 18,
          color: '#fff', fontWeight: 800, fontSize: 18
        }}>
          Drop PDFs into the AI workspace
        </div>
      )}

      {/* ── LEFT: Workspace Panel ────────────────────────────────────────────── */}
      <div style={{
        minWidth: 0,
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)', boxShadow: 'var(--shadow-md)'
      }}>
        {/* Document Tray & Header */}
        <div style={{
          padding: '10px 14px', display: 'flex', flexDirection: 'column',
          borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', gap: 10
        }}>
          <div className="ai-editor-toolbar" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 8, flexWrap: 'wrap'
          }}>
            <h2 style={{
              margin: 0, fontSize: 'clamp(13px, 3vw, 15px)', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <FileText size={17} color="var(--accent-primary)" /> AI Workspace
            </h2>
            <div className="ai-editor-toolbar-actions" style={{
              display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap'
            }}>
             
              {/* Undo / Redo controls */}
              {activeFile && (
                <div style={{
                  display: 'flex', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)'
                }}>
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0 || processing}
                    title="Undo"
                    style={{
                      border: 'none', background: 'transparent', padding: '4px 8px',
                      cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
                      color: historyIndex <= 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600
                    }}
                  >
                    <RotateCcw size={12} /> <span className="hide-mobile">Undo</span>
                  </button>
                  <div style={{ width: 1, background: 'var(--border-color)' }} />
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= historyStack.length - 1 || processing}
                    title="Redo"
                    style={{
                      border: 'none', background: 'transparent', padding: '4px 8px',
                      cursor: historyIndex >= historyStack.length - 1 ? 'not-allowed' : 'pointer',
                      color: historyIndex >= historyStack.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600
                    }}
                  >
                    <span className="hide-mobile">Redo</span> <RotateCw size={12} />
                  </button>
                </div>
              )}

              <input
                type="file" accept="application/pdf" multiple
                style={{ display: 'none' }} ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                className="btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                style={{
                  padding: '5px 10px', fontSize: 'clamp(11px, 2.5vw, 12px)', fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <UploadCloud size={13} /> <span className="hide-mobile">Import</span> PDFs
              </button>
              {activeFile && (
                <button
                  className="btn btn-primary"
                  onClick={downloadCurrentPdf}
                  disabled={processing}
                  style={{
                    padding: '5px 10px', fontSize: 'clamp(11px, 2.5vw, 12px)',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <Download size={13} /> <span className="hide-mobile">Download</span>
                </button>
              )}
            </div>
          </div>

          {/* Document selection horizontal tray */}
          {uploadedFiles.length > 0 && (
            <div style={{
              display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 0 6px',
              borderTop: '1px solid var(--border-color)', alignItems: 'center'
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tray:
              </span>
              {uploadedFiles.map((fileObj) => {
                const isActive = activeFile?.name === fileObj.file.name;
                return (
                  <div
                    key={fileObj.id}
                    onClick={() => !processing && switchActiveFile(fileObj)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 12px', borderRadius: 8,
                      background: isActive ? 'rgba(99,102,241,0.1)' : 'var(--bg-primary)',
                      border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      cursor: processing ? 'not-allowed' : 'pointer',
                      fontSize: 12, transition: 'all 0.15s ease', flexShrink: 0
                    }}
                  >
                    <FileText size={13} color={isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)'} />
                    <span style={{
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {fileObj.file.name}
                    </span>
                    <button
                      onClick={(e) => deleteUploadedFile(fileObj.id, e)}
                      disabled={processing}
                      style={{
                        border: 'none', background: 'transparent', padding: 0,
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        color: 'var(--text-tertiary)', transition: 'color 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}

              {/* Merge all button */}
              {uploadedFiles.length >= 2 && (
                <button
                  onClick={handleMergeAllTray}
                  disabled={processing}
                  style={{
                    padding: '5px 12px', borderRadius: 8,
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: '#10b981', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
                  }}
                >
                  <Sparkles size={12} /> Merge All Tray
                </button>
              )}
            </div>
          )}
        </div>

        {/* Viewport content */}
        <div style={{
          flex: 1, position: 'relative', background: 'var(--bg-tertiary)',
          overflow: 'hidden', minHeight: 300
        }}>
          {activeUrl ? (
            <PdfPreview url={activeUrl} fileName={activeFile?.name} />
          ) : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center'
            }}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: 'rgba(99,102,241,0.08)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                border: '2px dashed rgba(99,102,241,0.3)'
              }}>
                <UploadCloud size={40} color="var(--accent-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
                  Upload PDFs to AI Document Agent
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, maxWidth: 320 }}>
                  Drag and drop files or click import above. Once loaded, click suggested buttons or speak your command!
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}
              >
                <Sparkles size={16} /> Choose Documents
              </button>
            </div>
          )}

          {/* Real-time Background Queue Progress Timeline Overlay */}
          {processing && currentJobId && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 200,
              background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(8px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 20, padding: 30
            }}>
              <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-secondary)', padding: '24px 30px', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: '0 12px 50px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ position: 'relative' }}>
                    <Loader size={36} color="var(--accent-primary)" className="spin" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Asynchronous Action Pipeline</h4>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)' }}>Job ID: {currentJobId.substring(0, 18)}...</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    <span style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{jobStep}</span>
                    <span>{jobProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--bg-tertiary)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{ width: `${jobProgress}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 100, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Checklist Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                  {jobTimeline.map((step, idx) => {
                    const isDone = step.status === 'completed';
                    const isRun = step.status === 'processing';
                    const isFail = step.status === 'failed';
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: step.status === 'pending' ? 0.4 : 1 }}>
                        {isDone ? (
                          <CheckCircle2 size={16} color="#10b981" />
                        ) : isRun ? (
                          <Loader size={16} color="var(--accent-primary)" className="spin" />
                        ) : isFail ? (
                          <AlertCircle size={16} color="#ef4444" />
                        ) : (
                          <PlayCircle size={16} color="var(--text-tertiary)" />
                        )}
                        <span style={{
                          fontSize: 12.5,
                          fontWeight: isRun ? 600 : 500,
                          color: isRun ? 'var(--text-primary)' : isDone ? 'var(--text-secondary)' : 'var(--text-tertiary)'
                        }}>
                          {step.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT/ Bottom: Collapsible AI Chat Sidebar ──────────────────────── */}
      {!sidebarCollapsed && (
        <div className="ai-editor-chat-panel" style={{
          minWidth: 0,
          flex: isMobile ? '0 0 auto' : '0 0 min(390px, 100%)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)',
          background: 'rgba(20, 20, 35, 0.85)', backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-lg)', animation: 'slideRight 0.3s ease',
          ...(isMobile ? { maxHeight: '50vh', minHeight: 220, flex: '0 0 auto' } : {})
        }}>

          {/* Sidebar Header */}
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bot size={18} color="#fff" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fff' }}>AI Document Agent</p>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span id="ollama-status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Local NLP Engine · Voice Active
                </p>
              </div>
            </div>

            {/* Header controls */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setTtsEnabled(v => !v)}
                title={ttsEnabled ? 'Mute voice' : 'Unmute voice'}
                style={{
                  padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: ttsEnabled ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: ttsEnabled ? '#818cf8' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
              >
                {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              <button
                onClick={() => setSidebarCollapsed(true)}
                title="Minimize sidebar"
                style={{
                  padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer'
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Document Intelligence recommendations bar */}
          {activeFile && docClassification.type !== 'document' && (
            <div style={{
              background: 'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
              borderBottom: '1px solid rgba(99,102,241,0.2)',
              padding: '10px 16px'
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 10.5, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={11} /> Smart Context Suggestions ({docClassification.type.toUpperCase()})
              </p>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {docClassification.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSmartChip(s.command)}
                    disabled={processing}
                    style={{
                      whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 8,
                      border: '1px solid rgba(99,102,241,0.3)', fontSize: 11, fontWeight: 600,
                      background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages feed */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 16,
            display: 'flex', flexDirection: 'column', gap: 14,
            background: 'rgba(10, 10, 15, 0.4)'
          }}>
            {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
            <div ref={messagesEndRef} />
          </div>

          {/* Static suggested actions */}
          <div style={{
            padding: '8px 12px', background: 'rgba(15,15,25,0.8)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', gap: 6, overflowX: 'auto'
          }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => { setInputCommand(s.command); inputRef.current?.focus(); }}
                disabled={processing}
                style={{
                  whiteSpace: 'nowrap', padding: '5px 11px', borderRadius: 100,
                  border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, fontWeight: 500,
                  background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Voice recording indicators */}
          {isListening && (
            <div style={{
              padding: '8px 16px', background: 'rgba(239,68,68,0.1)',
              borderTop: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                  display: 'inline-block', animation: 'pulse 1s infinite'
                }} />
                Listening...
              </span>
              <CanvasWaveform isListening={isListening} />
            </div>
          )}

          {/* Form Command Bar */}
          <div style={{
            padding: '12px 14px', background: 'rgba(20,20,30,0.9)',
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
            <form className="ai-editor-command-form" onSubmit={handleFormSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              
              {/* Mic toggle */}
              <button
                type="button"
                onClick={toggleMic}
                disabled={processing}
                title={isListening ? 'Stop listening' : 'Start voice command (Alt+V / Ctrl+Space)'}
                style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${isListening ? 'transparent' : '#6366f1'}`,
                  background: isListening ? 'linear-gradient(135deg,#ef4444,#ec4899)' : 'rgba(99,102,241,0.1)',
                  color: isListening ? '#fff' : '#818cf8',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s ease',
                  opacity: processing ? 0.5 : 1
                }}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <input
                ref={inputRef}
                type="text"
                className="input"
                placeholder={
                  !activeFile ? 'Upload a PDF first...'
                  : isListening ? 'Speaking...'
                  : 'Type or speak a command...'
                }
                value={inputCommand}
                onChange={e => setInputCommand(e.target.value)}
                disabled={processing || !activeFile}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.03)',
                  borderColor: isListening ? '#ef4444' : 'rgba(255,255,255,0.1)',
                  color: '#fff', transition: 'all 0.2s'
                }}
              />

              <button
                type="submit"
                className="btn btn-primary"
                disabled={processing || !inputCommand.trim() || !activeFile}
                title="Send command"
                style={{
                  width: 44, height: 44, borderRadius: '50%', padding: 0, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {processing ? <Loader size={18} className="spin" /> : <Send size={18} />}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                🎙️ Say <strong style={{ color: 'rgba(255,255,255,0.7)' }}>"send it"</strong> to run voice instantly
              </p>
              {activeFile ? (
                <button
                  type="button"
                  onClick={() => setAutoSubmit(v => !v)}
                  style={{
                    border: 'none',
                    background: autoSubmit ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.04)',
                    color: autoSubmit ? '#86efac' : 'rgba(255,255,255,0.48)',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: '4px 8px',
                    cursor: 'pointer'
                  }}
                >
                  Auto-run voice {autoSubmit ? 'on' : 'off'}
                </button>
              ) : (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#818cf8',
                  display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer'
                }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Zap size={10} /> Upload PDF <ChevronRight size={10} />
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar expander button (when collapsed on desktop) */}
      {sidebarCollapsed && !isMobile && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          title="Expand AI Sidebar"
          style={{
            position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
            zIndex: 100, width: 36, height: 36, borderRadius: '50%',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)'
          }}
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Mobile expand button at bottom */}
      {sidebarCollapsed && isMobile && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          title="Open AI Chat"
          style={{
            position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 100, padding: '10px 24px', borderRadius: 100,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: 'white', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            fontSize: 14, fontWeight: 600, display: 'flex',
            alignItems: 'center', gap: 8
          }}
        >
          <Bot size={18} /> AI Chat
        </button>
      )}

    </div>
  );
};

export default AiEditor;
