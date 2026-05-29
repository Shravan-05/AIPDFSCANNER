import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, Bot, User, MessageSquare, Loader as LoaderIcon, Search, X } from 'lucide-react';
import ragAPI from '../services/ragAPI';

const SUGGESTIONS = [
  'Summarize this document in 5 bullet points',
  'What are the main topics covered?',
  'Extract all key dates and deadlines',
  'List all important definitions',
  'Explain the conclusion section',
  'Create 3 quiz questions from this content',
];

export default function PdfChat() {
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEnd = useRef(null);
  const fileRef = useRef(null);

  const loadDocs = useCallback(async () => {
    try {
      const { data } = await ragAPI.listDocuments();
      setDocuments(data || []);
    } catch (e) {
      if (e?.response?.status !== 401) setLoadError('Failed to load documents');
    }
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Add system greeting when activeDoc changes
  useEffect(() => {
    if (activeDoc) {
      setMessages([{
        sender: 'ai', text: 'I\'ve analyzed **' + activeDoc.originalName + '**. Ask me anything about its contents!',
      }]);
      setShowSuggestions(true);
    } else {
      setMessages([]);
    }
  }, [activeDoc]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setLoadError('Only PDF files are supported');
      return;
    }
    setUploading(true);
    setLoadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await ragAPI.upload(fd);
      setDocuments(prev => [data, ...prev]);
      setActiveDoc(data);
    } catch (err) {
      setLoadError(err?.response?.data?.msg || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    try {
      await ragAPI.delete(id);
      setDocuments(prev => prev.filter(d => d._id !== id));
      if (activeDoc?._id === id) setActiveDoc(null);
    } catch (err) {
      setLoadError('Delete failed');
    }
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || !activeDoc || loading) return;
    setInput('');
    setShowSuggestions(false);
    const userMsg = { sender: 'user', text: q };
    setMessages(prev => [...prev, userMsg, { sender: 'ai', text: '', isThinking: true }]);
    setLoading(true);
    try {
      const { data } = await ragAPI.ask(activeDoc._id, q);
      setMessages(prev => prev.slice(0, -1).concat({
        sender: 'ai',
        text: data.answer,
        sources: data.sources || [],
      }));
    } catch (err) {
      setMessages(prev => prev.slice(0, -1).concat({
        sender: 'ai',
        text: err?.response?.data?.msg || 'Sorry, I had trouble answering. Try rephrasing your question.',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const readyDocs = documents.filter(d => d.status === 'ready');

  return (
    <div className="pdf-chat-container">
      {/* Styles */}
      <style>{`
        .pdf-chat-container {
          display: flex; flex-direction: column; height: calc(100vh - var(--navbar-height, 56px) - 48px);
          max-width: 960px; margin: 0 auto; width: 100%;
        }
        .pdf-chat-docs { display: flex; gap: 8px; padding: 12px 0; overflow-x: auto; flex-shrink: 0; }
        .pdf-chat-doc-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 14px; border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          cursor: pointer; white-space: nowrap;
          font-size: 13px; color: var(--text-primary);
          transition: all 150ms ease; flex-shrink: 0;
        }
        .pdf-chat-doc-tab:hover { border-color: var(--accent-primary); }
        .pdf-chat-doc-tab.active { border-color: var(--accent-primary); background: rgba(99,102,241,0.1); }
        .pdf-chat-upload-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: var(--radius-md);
          border: 1px dashed var(--border-color);
          background: transparent; cursor: pointer;
          font-size: 13px; color: var(--text-secondary);
          transition: all 150ms ease; flex-shrink: 0;
        }
        .pdf-chat-upload-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
        .pdf-chat-messages {
          flex: 1; overflow-y: auto; padding: 16px 0;
          display: flex; flex-direction: column; gap: 16px;
        }
        .pdf-chat-msg { display: flex; gap: 10px; align-items: flex-start; }
        .pdf-chat-msg.user { flex-direction: row-reverse; }
        .pdf-chat-avatar {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          margin-top: 2px; border: 1px solid var(--border-color);
        }
        .pdf-chat-avatar.ai { background: linear-gradient(135deg,#6366f1,#8b5cf6); }
        .pdf-chat-avatar.user { background: var(--bg-tertiary); }
        .pdf-chat-bubble {
          padding: 10px 14px; border-radius: 14px; max-width: 85%;
          font-size: 13.5px; line-height: 1.6; box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-color);
        }
        .pdf-chat-bubble.ai { background: var(--bg-secondary); color: var(--text-primary); border-top-left-radius: 4px; }
        .pdf-chat-bubble.user { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; border-top-right-radius: 4px; }
        .pdf-chat-bubble.user p { margin: 0; }
        .pdf-chat-input-area { display: flex; gap: 8px; padding: 12px 0; flex-shrink: 0; }
        .pdf-chat-input {
          flex: 1; padding: 10px 14px; border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          background: var(--bg-secondary); color: var(--text-primary);
          font-size: 14px; resize: none; outline: none;
          transition: border-color 150ms ease;
        }
        .pdf-chat-input:focus { border-color: var(--accent-primary); }
        .pdf-chat-send-btn {
          padding: 10px 18px; border-radius: var(--radius-md);
          background: var(--accent-gradient); color: #fff;
          border: none; cursor: pointer; font-size: 14px; font-weight: 500;
          transition: opacity 150ms ease; flex-shrink: 0;
        }
        .pdf-chat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pdf-chat-thinking { display: flex; gap: 4px; padding: 4px 0; }
        .pdf-chat-thinking span { width: 6px; height: 6px; border-radius: 50%; background: var(--text-tertiary); animation: dotPulse 1.2s infinite; }
        .pdf-chat-thinking span:nth-child(2) { animation-delay: 0.2s; }
        .pdf-chat-thinking span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotPulse { 0%,80%,100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        .pdf-chat-sources { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-color); }
        .pdf-chat-source-tag { display: inline-block; padding: 1px 8px; border-radius: 10px; background: rgba(99,102,241,0.1); color: var(--accent-primary); font-size: 11px; margin: 2px 4px 2px 0; }
        .pdf-chat-suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
        .pdf-chat-suggestion-btn {
          padding: 6px 12px; border-radius: 16px; border: 1px solid var(--border-color);
          background: var(--bg-secondary); cursor: pointer; font-size: 12px;
          color: var(--text-secondary); transition: all 150ms ease;
        }
        .pdf-chat-suggestion-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); background: rgba(99,102,241,0.05); }
        .pdf-chat-progress { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--radius-md); background: var(--bg-secondary); border: 1px solid var(--border-color); font-size: 13px; color: var(--text-secondary); }
        .pdf-chat-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; gap: 12px; color: var(--text-tertiary); }
        .pdf-chat-empty-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color); }
      `}</style>

      {/* Upload area + doc tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>PDF Chat</h2>
      </div>
      <div className="pdf-chat-docs">
        <button className="pdf-chat-upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <LoaderIcon size={16} className="spin" /> : <Upload size={16} />}
          {uploading ? 'Processing...' : 'Upload PDF'}
        </button>
        <input ref={fileRef} type="file" accept=".pdf" onChange={handleUpload} hidden />
        {readyDocs.map(doc => (
          <div key={doc._id} className={'pdf-chat-doc-tab' + (activeDoc?._id === doc._id ? ' active' : '')}
               onClick={() => setActiveDoc(doc)}>
            <FileText size={16} />
            <span>{doc.originalName.length > 25 ? doc.originalName.slice(0, 22) + '...' : doc.originalName}</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 2 }}>({doc.totalPages || '?'}p)</span>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)' }}>
              <X size={14} />
            </button>
          </div>
        ))}
        {uploading && (
          <div className="pdf-chat-progress">
            <LoaderIcon size={16} className="spin" />
            <span>Processing PDF...</span>
          </div>
        )}
      </div>

      {loadError && (
        <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, marginBottom: 8 }}>
          {loadError}
          <button onClick={() => setLoadError('')} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 600 }}>Dismiss</button>
        </div>
      )}

      {/* Messages area */}
      {activeDoc ? (
        <div className="pdf-chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={'pdf-chat-msg ' + msg.sender}>
              {msg.sender === 'ai' && (
                <div className="pdf-chat-avatar ai"><Bot size={16} color="#fff" /></div>
              )}
              {msg.sender === 'user' && (
                <div className="pdf-chat-avatar user"><User size={16} color="var(--text-secondary)" /></div>
              )}
              <div className={'pdf-chat-bubble ' + msg.sender}>
                {msg.isThinking ? (
                  <div className="pdf-chat-thinking">
                    <span /><span /><span />
                  </div>
                ) : (
                  <>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pdf-chat-sources">
                        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                          Sources ({msg.sources.length}):
                        </div>
                        {msg.sources.map((s, j) => (
                          <span key={j} className="pdf-chat-source-tag" title={s.text}>
                            Page {s.pageNumber} ({Math.round(s.score * 100)}%)
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {showSuggestions && messages.length <= 1 && (
            <div className="pdf-chat-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="pdf-chat-suggestion-btn"
                        onClick={() => { setInput(s); setShowSuggestions(false); }}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <div ref={chatEnd} />
        </div>
      ) : (
        <div className="pdf-chat-empty">
          <div className="pdf-chat-empty-icon"><MessageSquare size={24} /></div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)' }}>Upload a PDF to start chatting</div>
          <div style={{ fontSize: 13 }}>Ask questions, get summaries, extract key info</div>
        </div>
      )}

      {/* Input area */}
      <div className="pdf-chat-input-area">
        <textarea
          className="pdf-chat-input"
          rows={1}
          placeholder={activeDoc ? 'Ask about this document...' : 'Upload a PDF first'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!activeDoc}
          style={{ maxHeight: 80 }}
        />
        <button className="pdf-chat-send-btn" onClick={handleSend} disabled={!input.trim() || !activeDoc || loading}>
          <Search size={18} />
        </button>
      </div>
    </div>
  );
}
