const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const RagDocument = require('../models/RagDocument');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const COMPLETION_MODEL = 'gpt-4o-mini';
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;
const TOP_K = 5;

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function embed(texts) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: Array.isArray(texts) ? texts : [texts] }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error('Embedding API error ' + res.status + ': ' + err.slice(0, 200));
  }
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

const RAG_SYSTEM_PROMPT = [
  'You are an intelligent PDF Analysis Assistant.',
  '',
  'Your primary role is to answer questions strictly using the information retrieved from the uploaded PDF documents.',
  '',
  'Rules:',
  '1. Always use the provided context from the retrieval system before answering.',
  '2. If the answer is present in the retrieved context, give a clear and accurate answer. Mention relevant page numbers if available. Summarize lengthy information when appropriate.',
  '3. If the answer is not found in the retrieved context, respond with: "I could not find this information in the uploaded document." Do not make up facts or hallucinate answers.',
  '4. For document-related tasks: summarize sections, extract key points, generate notes, create MCQs, explain concepts in simple language, compare information from different sections, extract tables and important data.',
  '5. When summarizing, use bullet points and highlight important facts, dates, formulas, and definitions.',
  '6. For academic PDFs, explain technical concepts step-by-step and provide examples when available in the document.',
  '7. For business or legal PDFs, maintain the original meaning. Do not provide legal or financial advice.',
  '8. Answer format: Direct Answer, Supporting Evidence, Page Reference (if available).',
  '9. If multiple retrieved chunks contain relevant information, combine them into a single coherent answer.',
  '10. Be concise, accurate, and document-grounded at all times.',
  '',
  'Retrieved Context:',
  '{context}',
  '',
  'User Question:',
  '{question}',
].join('\n');

function buildPrompt(context, question) {
  let ctxStr = '';
  for (const c of context) {
    const pageRef = c.pageNumber ? ' [Page ' + c.pageNumber + ']' : '';
    ctxStr += '--- Chunk' + pageRef + ' ---\n' + c.text + '\n\n';
  }
  return RAG_SYSTEM_PROMPT.replace('{context}', ctxStr.trim()).replace('{question}', question);
}

async function generateAnswer(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: COMPLETION_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error('Completion API error ' + res.status + ': ' + err.slice(0, 200));
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

exports.processDocument = async (filePath, userId, originalName) => {
  const doc = await RagDocument.create({ userId, originalName, storedName: path.basename(filePath), filePath, status: 'processing' });
  try {
    const buf = await fs.promises.readFile(filePath);
    const parsed = await pdfParse(buf);
    const fullText = parsed.text || '';
    const totalPages = parsed.numpages || 1;

    if (!fullText.trim()) {
      doc.status = 'error';
      doc.errorMessage = 'No extractable text found in this PDF. It may be a scanned image-based PDF.';
      await doc.save();
      return doc;
    }

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP });
    const rawChunks = await splitter.splitText(fullText);

    const lines = fullText.split('\n');
    const chunks = rawChunks.map((text, i) => {
      const firstLinePos = fullText.indexOf(text.slice(0, 50));
      const lineBefore = fullText.slice(0, Math.max(0, firstLinePos)).split('\n').length;
      const estimatedPage = Math.max(1, Math.round((lineBefore / lines.length) * totalPages));
      return { text, pageNumber: Math.min(estimatedPage, totalPages), index: i };
    });

    const texts = chunks.map(c => c.text);
    const embeddings = await embed(texts);

    for (let i = 0; i < chunks.length; i++) {
      chunks[i].embedding = embeddings[i];
    }

    doc.chunks = chunks;
    doc.totalPages = totalPages;
    doc.totalChars = fullText.length;
    doc.chunkCount = chunks.length;
    doc.status = 'ready';
    await doc.save();
    return doc;
  } catch (err) {
    doc.status = 'error';
    doc.errorMessage = err.message;
    await doc.save();
    return doc;
  }
};

exports.askQuestion = async (documentId, userId, question) => {
  const doc = await RagDocument.findOne({ _id: documentId, userId });
  if (!doc) throw new Error('Document not found');
  if (doc.status !== 'ready') throw new Error('Document is not ready yet (status: ' + doc.status + ')');

  const [questionEmbedding] = await embed([question]);
  const scored = doc.chunks
    .map(c => ({ ...c.toObject(), score: cosineSimilarity(questionEmbedding, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .filter(c => c.score > 0.3);

  if (scored.length === 0) {
    return {
      answer: 'I could not find this information in the uploaded document.',
      sources: [],
      documentId,
    };
  }

  const prompt = buildPrompt(scored, question);
  const answer = await generateAnswer(prompt);

  return {
    answer,
    sources: scored.map(c => ({
      text: c.text.slice(0, 300),
      pageNumber: c.pageNumber,
      score: Math.round(c.score * 100) / 100,
    })),
    documentId,
  };
};

exports.listDocuments = async (userId) => {
  return RagDocument.find({ userId }, { chunks: 0 }).sort({ createdAt: -1 }).lean();
};

exports.getDocument = async (documentId, userId) => {
  return RagDocument.findOne({ _id: documentId, userId }, { chunks: 0 }).lean();
};

exports.deleteDocument = async (documentId, userId) => {
  const doc = await RagDocument.findOneAndDelete({ _id: documentId, userId });
  if (!doc) throw new Error('Document not found');
  try { await fs.promises.unlink(doc.filePath); } catch {}
  return doc;
};
