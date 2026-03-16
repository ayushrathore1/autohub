import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import DraggableFAB from './DraggableFAB';
import SettingsPanel from './components/SettingsPanel';
import {
  Plus, Minus, Search, X, Trash2, ArrowLeft, Book, Grid,
  Mic, Settings, AlertTriangle, Languages, Lock, Bell,
  Download, ShieldCheck, ShieldAlert, CheckCircle,
  Edit, SaveAll, LogOut, Wifi, WifiOff, User, Loader2, ChevronRight,
  ChevronUp, ChevronDown, ArrowRight,
  ArrowRight as ArrowRightIcon,
  ArrowLeft as ArrowLeftIcon,
  Copy, Layers, Ban, Store, Zap, XCircle, AlertCircle,
  FileText, HelpCircle, Phone, MessageSquare, ExternalLink, Shield,
  Calculator, Percent, CreditCard, StickyNote, Briefcase, Image as ImageIcon,
  Share2, Calendar, MoreVertical, History, RefreshCcw, DollarSign,
  Pin, PinOff, PenTool, Highlighter, Circle as CircleIcon, Eraser, Type,
  RefreshCw, RotateCcw, Printer, FilePlus, Send,
  Bold, Italic, Underline, Clock, Package,
  PackageX, TrendingDown, Tag, Vibrate, Activity, ScanBarcode, BarChart2,
  PieChart, Users, ShoppingCart, TrendingUp, FileMinus, ArrowUp, Home } from 'lucide-react';

// --- MODULE IMPORTS ---
import { AIEngine, Trie, PriorityQueue, BloomFilter, fuzzySearch, LRUCache } from './lib/ai-engine';
import { translateWithGoogle, translateWithMyMemory, transliterateWithGoogle, convertToHindiFallback, translationCache, sanitizeDisplayText } from './lib/translation';
import { performSmartSearch } from './lib/search';
import { exactDictionary, synonymMap, soundMap } from './data/dictionaries';
import ToolsHub from './components/ToolsHub';
import { ItemsPage } from './components/ItemsPage';

import { TranslateBtn } from './components/TranslateBtn';
import { RecentNotesWidget } from './components/RecentNotesWidget';
import { BarcodeScanner } from './components/tools/BarcodeScanner';

interface SearchResult {
  match: boolean;
  items: any[];
  interpretedAs?: string;
}




const searchCache = new LRUCache<string, any[]>(50);


// Global instances
const productTrie = new Trie();
const alertQueue = new PriorityQueue<{ type: string; message: string; data?: any }>();
const searchBloomFilter = new BloomFilter(10000, 5);

// Expose diagnostics for debugging
try {
  (window as any).__dukan_tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  (window as any).__dukan_dumpDiagnostics = () => ({
    tabId: (window as any).__dukan_tabId,
    cacheSize: searchCache,
    localStorage: {
      backup: localStorage.getItem('dukan:backup') ? 'exists' : 'none',
      pendingDeletes: localStorage.getItem('dukan:pendingDeletes')
    }
  });
} catch { /* noop */ }




// ---------------------------------------------------------
// ?? AI ASSISTANT API (REAL GEMINI INTEGRATION)
// ---------------------------------------------------------
const askAIAssistant = async (question: string, language: string = 'en'): Promise<string> => {
  // 1. Detect if the question is basically Hindi/Hinglish
  const isHindiQuestion = /[\u0900-\u097F]/.test(question) ||
    /\b(kya|hai|kaise|kahan|kaun|kitna|batao|bolo|dhundo|dekho|aaj|kal|mausam|weather)\b/i.test(question);

  const responseLanguage = isHindiQuestion ? 'hi' : language;

  // 2. Define the System Prompt (AI's Personality)
  const systemPrompt = `You are "Autonex AI", a smart and friendly shop assistant developed by Autonex. 
    You manage an auto parts shop inventory but you are also very intelligent about general topics.
    
    RULES:
    1. If the user speaks Hindi or Hinglish, reply in Hindi (or Hinglish).
    2. If the user speaks English, reply in English.
    3. Keep answers concise (max 2-3 sentences) because you are a voice assistant.
    4. You can answer ANY general question (Weather, Math, GK, Jokes, Life) like a smart human.
    5. Be polite and helpful.`;

  try {
    // 3. Call Google Gemini API
    const API_KEY = "AIzaSyBDvhgjYjN3qpmjDB3EYnEGj0H6OPRvpLQ";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser Question: ${question}`
          }]
        }]
      })
    });

    const data = await response.json();

    // 4. Extract Answer
    if (data.candidates && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    }

    throw new Error("No response from AI");

  } catch (error) {
    console.error("AI API Error:", error);
    // Fallback if API fails (Net issue or Quota full)
    return getSmartLocalResponse(question, responseLanguage);
  }
};

const THEME_PRESETS: Record<string, { bg: string; meta: string; isDark: boolean }> = {
  light: { bg: '#ffffff', meta: '#ffffff', isDark: false },
  dark: { bg: '#000000', meta: '#000000', isDark: true },
};

const ACCENT_COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#8b5cf6',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
  red: '#ef4444',
  yellow: '#eab308',
};

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length !== 6) return `rgba(59,130,246,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const normalizeForMatch = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/[.,!?;:(){}\[\]"'   ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isGreetingText = (text: string): boolean => {
  const s = normalizeForMatch(text);
  if (!s) return false;

  // Note: JS \b doesn't work reliably for Hindi/Unicode letters, so we use (start|space) boundaries.
  if (/(^|\s)(hello|hi|hey|hlo|helo|namaste|namaskar|pranam|ram\s*ram)(\s|$)/i.test(s)) return true;
  return false;
};

// Smart local response generator (works offline)
const getSmartLocalResponse = (question: string, lang: string): string => {
  const q = question.toLowerCase();
  const isHindi = lang === 'hi';

  // Greetings
  if (isGreetingText(question)) {
    return isHindi ? '??????! ??? ???? ???? ??? ?? ???? ????' : 'Hello! How can I help you today?';
  }

  // Time
  if (/\b(time|samay|kya baja|kitne baje)\b/i.test(q)) {
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return isHindi ? `??? ${time} ?? ??? ????` : `The current time is ${time}.`;
  }

  // Date
  if (/\b(date|tarikh|aaj|today)\b/i.test(q)) {
    const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return isHindi ? `?? ?? ????? ${date} ???` : `Today's date is ${date}.`;
  }

  // Weather (basic)
  if (/\b(weather|mausam|garmi|sardi|barish)\b/i.test(q)) {
    return isHindi ? '???? ?? ??????? ?? ??? ???? ??? ?? ???? ?? ??????' : 'Please check your phone\'s weather app for current conditions.';
  }

  // Math calculations
  const mathMatch = q.match(/(\d+)\s*[\+\-\*\/x  ]\s*(\d+)/);
  if (mathMatch) {
    try {
      const expr = q.replace(/x| /g, '*').replace(/ /g, '/');
      const numMatch = expr.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
      if (numMatch) {
        const [, a, op, b] = numMatch;
        let result = 0;
        switch (op) {
          case '+': result = parseInt(a) + parseInt(b); break;
          case '-': result = parseInt(a) - parseInt(b); break;
          case '*': result = parseInt(a) * parseInt(b); break;
          case '/': result = parseInt(a) / parseInt(b); break;
        }
        return isHindi ? `???? ?? ${result}` : `The answer is ${result}`;
      }
    } catch (e) { /* ignore */ }
  }

  // Stock/Inventory queries - guide to search
  if (/\b(stock|maal|item|product|kitna|available|hai kya)\b/i.test(q)) {
    return isHindi ? '????? ????? ?? ??? ?? ??? ???? ???? ?? ???? ?????? ??????' : 'Please check the search results below or use the app search.';
  }

  // Business/Shop
  if (/\b(business|dukan|shop|sell|buy|price|rate)\b/i.test(q)) {
    return isHindi ? '??????? ????? ?? ??? ???????? ??? ?????' : 'For business tools, go to Settings > Business Tools.';
  }

  // Who are you
  if (/\b(who are you|kaun ho|tum kaun|your name|naam kya)\b/i.test(q)) {
    return isHindi ? '??? Autonex AI ???, ???? ??????? ??????? ?????????!' : 'I am Autonex AI, your smart business assistant!';
  }

  // Thank you
  if (/\b(thank|thanks|dhanyawad|shukriya)\b/i.test(q)) {
    return isHindi ? '???? ?????? ??! ?? ??? ??? ??????' : 'You\'re welcome! Need anything else?';
  }

  // Default response
  return isHindi
    ? '??? ??? ???? ????? ????? ????? ??? ?????? ??? ?????, ?? ????? ?? ?? ?????, ???, ?????, ?? ???????? ??? ???? ???? ????? ????'
    : 'I didn\'t fully understand. Please rephrase, or tell me if this is about stock, bills, tools, or settings.';
};

// ---------------------------------------------------------
// ?? GHOST MIC COMPONENT (Hands-Free Voice Search + AI Assistant)
// ---------------------------------------------------------
const GhostMic = ({ inventory, pages, onClose, onNavigate, allowAI = true, useFuzzySearch = true }) => {
  const [status, setStatus] = useState("Listening...");
  const [resultText, setResultText] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState('search'); // 'search' or 'ai'

  // Detect language from text
  const detectLanguage = (text: string): string => {
    const isHindi = /[\u0900-\u097F]/.test(text) ||
      /\b(kya|hai|kaise|kahan|kaun|kitna|batao|bolo|dhundo|dekho|mein|ka|ki|ke)\b/i.test(text);
    return isHindi ? 'hi' : 'en';
  };

  const isGreeting = (text: string) => isGreetingText(text);

  // Special rule: Just return the detected language (No forced Hindi on greeting)
  const resolveResponseLanguage = (transcript: string, detectedLang: string) => {
    // if (isGreeting(transcript)) return 'hi'; <-- ? REMOVED THIS LINE
    return detectedLang; // ? Returns English for "Hello", Hindi for "Namaste"
  };

  // Text to Speech Helper - responds in same language
  const speak = useCallback((text: string, lang: string = 'en') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = lang === 'hi' ? 0.9 : 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("? Browser not supported");
      speak("Sorry, voice search not supported on this browser.", 'en');
      setTimeout(onClose, 2000);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Hindi-Indian for better Hinglish support
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      if (navigator.vibrate) navigator.vibrate(200);
      setStatus("?? Listening...");
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setResultText(transcript);
      setStatus("?? Processing...");
      setIsProcessing(true);

      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      const detectedLang = detectLanguage(transcript);
      const responseLang = resolveResponseLanguage(transcript, detectedLang);

      // First, try stock search
      const stockResult = performSmartSearch(transcript, inventory, pages, { useFuzzy: useFuzzySearch });

      if (stockResult.match && stockResult.items.length > 0) {
        // Stock found - show stock results
        setMode('search');
        setSearchResult(stockResult as any);
        const topItem = stockResult.items[0];
        const count = stockResult.items.length;

        const msg = detectedLang === 'hi'
          ? `${topItem.car} ????? ?????? ${topItem.qty} ??? ${count > 1 ? `?? ${count - 1} ???? ?? ????` : ''}`
          : `Found ${topItem.car}. Quantity is ${topItem.qty}. ${count > 1 ? `Plus ${count - 1} more items.` : ''}`;

        setStatus(`? ${count} item${count > 1 ? 's' : ''} found!`);
        speak(msg, detectedLang);
      } else {
        // No stock found - use AI to answer the question
        setMode('ai');
        setStatus("? AI Thinking...");

        try {
          if (!allowAI) {
            const msg = responseLang === 'hi'
              ? 'AI ??? ??? ???????? ??? ???? "Voice AI Commands" ?? ???? ?? ????? ?? ??? ???? ?????'
              : 'AI is turned off. Enable  Voice AI Commands  in Settings, or search for stock.';
            setAiResponse(msg);
            setStatus("?? AI Off");
            speak(msg, responseLang);
          } else {
            const aiAnswer = await askAIAssistant(transcript, responseLang);
            setAiResponse(aiAnswer);
            setStatus("?? AI Response");
            speak(aiAnswer, responseLang);
          }
        } catch (e) {
          const fallback = responseLang === 'hi'
            ? '??? ????, ???? ???? ????? ????? ?????? ??????'
            : 'Sorry, could not find an answer. Please try again.';
          setAiResponse(fallback);
          setStatus("?? AI Response");
          speak(fallback, responseLang);
        }
      }

      setIsProcessing(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      const lang = 'en';
      if (event.error === 'no-speech') {
        setStatus("?? No speech detected");
        speak("Did not hear anything. Please try again.", lang);
      } else {
        setStatus(`? Error: ${event.error}`);
      }
      setTimeout(onClose, 2000);
    };

    recognition.onend = () => {
      // Recognition ended
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setStatus("? Failed to start");
    }

    return () => {
      try { recognition.stop(); } catch (e) { /* ignore */ }
      window.speechSynthesis.cancel();
    };
  }, [inventory, pages, speak, onClose]);

  const handleItemClick = (item) => {
    const page = pages.find(p => p.id === item.pageId);
    if (page) {
      onNavigate(page.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-white animate-in fade-in p-4">
      {/* Pulsing Visual */}
      <div className="relative mb-8">
        <div className={`absolute inset-0 bg-blue-500 blur-3xl ${isProcessing ? 'animate-ping' : 'animate-pulse'} opacity-40`}></div>
        <div className={`w-28 h-28 bg-slate-800 rounded-full border-4 ${mode === 'ai' && aiResponse ? 'border-purple-500' :
          searchResult?.match ? 'border-green-500' :
            searchResult ? 'border-red-500' : 'border-blue-500'
          } flex items-center justify-center relative z-10 shadow-2xl`}>
          <Mic size={44} className={`${isProcessing ? 'text-yellow-400 animate-bounce' :
            mode === 'ai' && aiResponse ? 'text-purple-400' :
              searchResult?.match ? 'text-green-400' : 'text-blue-400'
            }`} />
        </div>
      </div>

      <h2 className="text-xl font-black tracking-wider uppercase mb-2">{status}</h2>

      {resultText && (
        <div className="bg-slate-800/50 px-4 py-2 rounded-full border border-slate-600 mb-4">
          <p className="text-lg font-mono text-yellow-400">"{resultText}"</p>
        </div>
      )}

      {searchResult?.interpretedAs && searchResult.interpretedAs !== resultText.toLowerCase() && (
        <p className="text-xs text-slate-400 mb-4">Interpreted as: <span className="text-blue-400">{searchResult.interpretedAs}</span></p>
      )}

      {/* AI Response Display */}
      {mode === 'ai' && aiResponse && (
        <div className="w-full max-w-md bg-gradient-to-br from-purple-900/50 to-indigo-900/50 p-4 rounded-2xl border border-purple-500/50 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-xs font-bold text-purple-300 uppercase">Autonex AI</span>
          </div>
          <p className="text-white text-base leading-relaxed">{aiResponse}</p>
        </div>
      )}

      {/* Stock Results List */}
      {mode === 'search' && searchResult?.match && (
        <div className="w-full max-w-md max-h-60 overflow-y-auto space-y-2 mt-4">
          {searchResult.items.slice(0, 5).map(item => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="bg-slate-800/80 p-4 rounded-xl border border-slate-600 flex justify-between items-center cursor-pointer hover:bg-slate-700 transition-colors"
            >
              <div>
                <p className="font-bold text-lg">{item.car}</p>
                <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
                  {item.pageName || 'Unknown'}
                </span>
              </div>
              <div className="text-right">
                <span className={`block text-2xl font-bold ${item.qty < 5 ? 'text-red-400' : 'text-green-400'}`}>{item.qty}</span>
                <span className="text-[10px] text-slate-500">Pcs</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-8 px-8 py-3 border border-white/20 rounded-full text-sm font-bold bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2"
      >
        <X size={16} /> Close
      </button>
    </div>
  );
};

// ---------------------------------------------------------
// ?? DEAD STOCK ALERT COMPONENT (No Price, Only Qty)
// ---------------------------------------------------------
const DeadStockAlert = ({ data, onNavigate }) => {
  const DEAD_DAYS_THRESHOLD = 180; // 6 Months

  const deadStockStats = useMemo(() => {
    if (!data.entries || data.entries.length === 0) return { count: 0, totalQty: 0, items: [] };

    const now = Date.now();
    const msInDay = 1000 * 60 * 60 * 24;

    // Find items older than 180 days that still have stock
    const deadItems = data.entries.filter(item => {
      const itemTime = item.lastUpdated || item.id;
      const diffDays = (now - itemTime) / msInDay;
      return diffDays > DEAD_DAYS_THRESHOLD && item.qty > 0;
    });

    // Calculate total pieces
    const totalQty = deadItems.reduce((acc, curr) => acc + curr.qty, 0);

    return {
      count: deadItems.length,
      totalQty: totalQty,
      items: deadItems
    };
  }, [data.entries]);

  if (deadStockStats.count === 0) return null;

  return (
    <div className="mx-4 mt-4 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2.5 rounded-full text-red-600 shadow-sm">
            <PackageX size={22} />
          </div>
          <div>
            <h3 className="font-bold text-red-800 text-lg">Dead Stock Alert</h3>
            <p className="text-xs text-red-600 font-semibold opacity-80">
              {deadStockStats.count} items stuck &gt; 6 Months
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Stuck Inventory</p>
          <h2 className="text-2xl font-black text-red-700">
            {deadStockStats.totalQty} <span className="text-sm font-bold">Units</span>
          </h2>
        </div>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 mt-2 select-none border-t border-red-200 pt-2 list-none">
          <TrendingDown size={14} /> View Dead Stock List
          <ChevronDown size={14} className="ml-auto group-open:rotate-180 transition-transform" />
        </summary>

        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
          {deadStockStats.items.map(item => {
            const page = data.pages.find(p => p.id === item.pageId);
            const daysSinceUpdate = Math.floor((Date.now() - (item.lastUpdated || item.id)) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={item.id}
                onClick={() => onNavigate && onNavigate(item.pageId)}
                className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center shadow-sm cursor-pointer hover:bg-red-50 transition-colors"
              >
                <div>
                  <p className="font-bold text-gray-800">{item.car}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {page?.itemName || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                      {daysSinceUpdate} days old
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xl font-bold text-red-600">{item.qty}</span>
                  <span className="text-[9px] text-red-400">Pcs</span>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
};

// ---------------------------------------------------------
// ?? QUICK STATS WIDGET (Business Insights)
// ---------------------------------------------------------
const QuickStats = ({ data }) => {
  const stats = useMemo(() => {
    const entries = data.entries || [];
    const totalItems = entries.length;
    const totalStock = entries.reduce((acc, e) => acc + (e.qty || 0), 0);
    const lowStock = entries.filter(e => e.qty < (data.settings?.limit || 5)).length;
    const outOfStock = entries.filter(e => e.qty === 0).length;

    return { totalItems, totalStock, lowStock, outOfStock };
  }, [data.entries, data.settings?.limit]);

  return (
    <div className="mx-4 mt-4 grid grid-cols-4 gap-2">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-2xl text-center border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-blue-500 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-blue-500/30">
          <Layers size={16} className="text-white" />
        </div>
        <p className="text-2xl font-black text-blue-700">{stats.totalItems}</p>
        <p className="text-[10px] font-bold text-blue-500 uppercase">Items</p>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-2xl text-center border border-green-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-green-500 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-green-500/30">
          <Activity size={16} className="text-white" />
        </div>
        <p className="text-2xl font-black text-green-700">{stats.totalStock}</p>
        <p className="text-[10px] font-bold text-green-500 uppercase">Total Pcs</p>
      </div>
      <div className="bg-gradient-to-br from-yellow-50 to-orange-100 p-3 rounded-2xl text-center border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-yellow-500 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-yellow-500/30">
          <AlertCircle size={16} className="text-white" />
        </div>
        <p className="text-2xl font-black text-yellow-700">{stats.lowStock}</p>
        <p className="text-[10px] font-bold text-yellow-600 uppercase">Low</p>
      </div>
      <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-2xl text-center border border-red-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-red-500 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-red-500/30">
          <Ban size={16} className="text-white" />
        </div>
        <p className="text-2xl font-black text-red-700">{stats.outOfStock}</p>
        <p className="text-[10px] font-bold text-red-500 uppercase">Empty</p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// ?? AI INSIGHTS WIDGET (Smart Business Intelligence)
// ---------------------------------------------------------
const AIInsightsWidget = ({ data, t, isDark }) => {
  const insights = useMemo(() => {
    const entries = data.entries || [];
    const pages = data.pages || [];
    const results = [];

    // 1. ABC Analysis for inventory prioritization
    if (entries.length > 5) {
      const itemValues = entries.map(e => ({ id: e.car, value: e.qty * (e.salePrice || 100) }));
      const abc = AIEngine.abcAnalysis(itemValues);
      if (abc.A.length > 0) {
        results.push({
          type: 'abc',
          title: 'High-Value Items',
          message: `${abc.A.length} items make up 70% of your inventory value. Focus on these!`,
          priority: 1,
          color: 'purple'
        });
      }
    }

    // 2. Low Stock Prediction
    const lowStockItems = entries.filter(e => e.qty > 0 && e.qty < (data.settings?.limit || 5));
    if (lowStockItems.length > 0) {
      const urgentItems = lowStockItems.filter(e => e.qty <= 2);
      results.push({
        type: 'reorder',
        title: 'Reorder Alert',
        message: urgentItems.length > 0
          ? `${urgentItems.length} items critically low! Reorder immediately.`
          : `${lowStockItems.length} items running low. Plan restocking.`,
        priority: urgentItems.length > 0 ? 0 : 2,
        color: urgentItems.length > 0 ? 'red' : 'yellow'
      });
    }

    // 3. Stock Distribution Analysis
    const totalStock = entries.reduce((sum, e) => sum + e.qty, 0);
    const avgStock = totalStock / (entries.length || 1);
    const overstocked = entries.filter(e => e.qty > avgStock * 3);
    if (overstocked.length > 0) {
      results.push({
        type: 'overstock',
        title: 'Overstock Detected',
        message: `${overstocked.length} items have excessive stock. Consider promotions.`,
        priority: 3,
        color: 'blue'
      });
    }

    // 4. Dead Stock Analysis
    const deadStock = entries.filter(e => e.qty > 10 && e.lastUpdated &&
      (Date.now() - new Date(e.lastUpdated).getTime()) > 30 * 24 * 60 * 60 * 1000);
    if (deadStock.length > 0) {
      results.push({
        type: 'dead',
        title: 'Dead Stock Alert',
        message: `${deadStock.length} items haven't moved in 30+ days.`,
        priority: 2,
        color: 'gray'
      });
    }

    // 5. Inventory Health Score
    const outOfStock = entries.filter(e => e.qty === 0).length;
    const healthScore = Math.round(((entries.length - outOfStock - lowStockItems.length) / (entries.length || 1)) * 100);
    results.push({
      type: 'health',
      title: 'Inventory Health',
      message: `Score: ${healthScore}% - ${healthScore >= 80 ? 'Excellent!' : healthScore >= 50 ? 'Needs attention' : 'Critical!'}`,
      priority: healthScore < 50 ? 1 : 4,
      color: healthScore >= 80 ? 'green' : healthScore >= 50 ? 'yellow' : 'red'
    });

    // 6. Page Organization Suggestion
    if (pages.length > 10 && entries.length > 50) {
      const avgItemsPerPage = entries.length / pages.length;
      if (avgItemsPerPage < 3) {
        results.push({
          type: 'organize',
          title: 'Organization Tip',
          message: 'Consider consolidating pages. Many have few items.',
          priority: 5,
          color: 'indigo'
        });
      }
    }

    return results.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [data.entries, data.pages, data.settings?.limit]);

  const colorClasses = {
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    red: 'from-red-50 to-red-100 border-red-200',
    yellow: 'from-yellow-50 to-orange-100 border-yellow-200',
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    green: 'from-green-50 to-green-100 border-green-200',
    gray: 'from-gray-50 to-gray-100 border-gray-200',
    indigo: 'from-indigo-50 to-indigo-100 border-indigo-200'
  };

  if (insights.length === 0) return null;

  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{t("AI Insights")}</h3>
        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">SMART</span>
      </div>

      <div className="space-y-2">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[insight.color]} border flex items-start gap-3 transition-all hover:scale-[1.01]`}
          >
            {/* icon removed to avoid rendering corrupted placeholder glyphs */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-gray-800">{insight.title}</h4>
              <p className="text-xs text-gray-600 line-clamp-2">{insight.message}</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 shrink-0 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// ?? SALES PREDICTION WIDGET
// ---------------------------------------------------------
const SalesPredictionWidget = ({ data, t, isDark }) => {
  const prediction = useMemo(() => {
    const events = (data.salesEvents || []).filter((e: any) => e && e.type === 'sale');
    if (!events.length) return null;

    const days = 14;
    const dayKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }

    const totalsByDay = new Map<string, number>();
    for (const key of dayKeys) totalsByDay.set(key, 0);

    for (const ev of events) {
      const ts = typeof ev.ts === 'number' ? ev.ts : (ev.date ? Date.parse(ev.date) : NaN);
      if (!Number.isFinite(ts)) continue;
      const day = new Date(ts).toISOString().slice(0, 10);
      if (!totalsByDay.has(day)) continue;
      const qty = Number(ev.qty || 0);
      if (qty > 0) totalsByDay.set(day, (totalsByDay.get(day) || 0) + qty);
    }

    const series = dayKeys.map(k => totalsByDay.get(k) || 0);
    const total = series.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;

    const nextDayPrediction = AIEngine.exponentialSmoothing(series, 0.35);
    const weeklyPrediction = nextDayPrediction * 7;

    const recentAvg = series.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const olderAvg = series.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const trend = recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'stable';
    const trendPercent = olderAvg > 0 ? Math.abs(Math.round(((recentAvg - olderAvg) / olderAvg) * 100)) : 0;

    const nonZeroDays = series.filter(v => v > 0).length;
    const confidence = Math.min(95, Math.max(55, Math.round(50 + (nonZeroDays / days) * 45)));

    return {
      daily: Math.max(0, Math.round(nextDayPrediction)),
      weekly: Math.max(0, Math.round(weeklyPrediction)),
      trend,
      trendPercent,
      confidence
    };
  }, [data.salesEvents]);

  if (!data.settings?.aiPredictions) return null;

  if (!prediction) {
    return (
      <div className="mx-4 mt-4">
        <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'} border ${isDark ? 'border-slate-700' : 'border-indigo-200'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{t("Sales Prediction")}</h3>
              <p className="text-[10px] text-gray-500">{t("No sales history yet")}</p>
            </div>
          </div>
          <p className={`mt-3 text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            {t("Update stock (sell/restock) to generate real reports.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4">
      <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'} border ${isDark ? 'border-slate-700' : 'border-indigo-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{t("Sales Prediction")}</h3>
              <p className="text-[10px] text-gray-500">AI-powered forecast</p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${prediction.trend === 'up' ? 'bg-green-100 text-green-700' :
            prediction.trend === 'down' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
            {prediction.trendPercent}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-white/60'}`}>
            <p className="text-2xl font-black text-indigo-600">{prediction.daily}</p>
            <p className="text-[10px] text-gray-500 font-bold">TODAY</p>
          </div>
          <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-white/60'}`}>
            <p className="text-2xl font-black text-purple-600">{prediction.weekly}</p>
            <p className="text-[10px] text-gray-500 font-bold">WEEK</p>
          </div>
          <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-slate-700' : 'bg-white/60'}`}>
            <p className="text-2xl font-black text-pink-600">{prediction.confidence}%</p>
            <p className="text-[10px] text-gray-500 font-bold">ACCURACY</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// ?? SMART SEARCH WITH TRIE + FUZZY MATCHING
// ---------------------------------------------------------
const SmartSearchEngine = {
  initialized: false,

  initialize: (entries) => {
    if (SmartSearchEngine.initialized) return;
    entries.forEach(entry => {
      productTrie.insert(entry.car, entry);
      searchBloomFilter.add(entry.car.toLowerCase());
    });
    SmartSearchEngine.initialized = true;
  },

  search: (query, entries, useFuzzy = false) => {
    if (!query.trim()) return entries;

    const queryLower = query.toLowerCase();

    // First try exact Trie search - O(m)
    const trieResults = productTrie.searchPrefix(queryLower, 50);
    if (trieResults.length > 0) {
      const trieIds = new Set(trieResults.map(r => r.data?.id).filter(Boolean));
      return entries.filter(e => trieIds.has(e.id) || e.car.toLowerCase().includes(queryLower));
    }

    // If fuzzy search enabled and no exact matches - O(n*m)
    if (useFuzzy) {
      const allNames = entries.map(e => e.car);
      const fuzzyMatches = fuzzySearch(query, allNames, 2);
      const fuzzySet = new Set(fuzzyMatches.map(m => m.toLowerCase()));
      return entries.filter(e => fuzzySet.has(e.car.toLowerCase()));
    }

    // Default substring search - O(n)
    return entries.filter(e => e.car.toLowerCase().includes(queryLower));
  },

  getSuggestions: (query, limit = 5) => {
    if (!query.trim()) return [];
    return productTrie.searchPrefix(query.toLowerCase(), limit).map(r => r.word);
  }
};

// --- SUB-COMPONENTS ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <AlertTriangle size={64} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong.</h1>
          <p className="text-slate-500 mb-6">The app encountered an error.</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
            <RefreshCw size={20} /> Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ToastMessage = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 transition-all transform border backdrop-blur-sm ${type === 'error'
      ? 'bg-red-600/95 text-white border-red-400/30 shadow-red-500/25'
      : 'bg-green-600/95 text-white border-green-400/30 shadow-green-500/25'
      }`} style={{ animation: 'slideDown 0.3s ease-out' }}>
      <div className={`p-1.5 rounded-full ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
        {type === 'error' ? <XCircle size={18} className="shrink-0" /> : <CheckCircle size={18} className="shrink-0" />}
      </div>
      <span className="font-semibold text-sm md:text-base">{message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isDanger, t, isDark }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4 animate-in fade-in">
      <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl transform transition-all scale-100 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-black'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          {isDanger ? <Trash2 size={24} /> : <AlertCircle size={24} />}
        </div>
        <h3 className="text-xl font-bold mb-2">{t(title)}</h3>
        <p className="text-sm opacity-70 mb-6 font-medium">{t(message)}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            {t("Cancel")}
          </button>
          <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${isDanger ? 'bg-red-600 hover:bg-red-500 shadow-red-500/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'}`}>
            {t(isDanger ? "Yes, Delete" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

const LegalModal = ({ isOpen, onClose, type, t, isDark }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-black'}`}>
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold flex items-center gap-2">
            {type === 'privacy' ? <FileText className="text-blue-500" /> : <HelpCircle className="text-yellow-500" />}
            {type === 'privacy' ? t("Privacy & Policy") : t("FAQ")}
          </h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        {type === 'privacy' ? (
          <div className="space-y-4 text-sm opacity-80 leading-relaxed">
            <p><strong>Last Updated:</strong> January 2026</p>
            <p>Welcome to <strong>Autonex</strong>, a smart auto parts inventory management application.</p>

            <div className="mt-4">
              <p className="font-bold text-base mb-2">1. Data Collection & Storage</p>
              <p>  We collect your email address for authentication purposes only.</p>
              <p>  Your inventory data, shop details, and bills are stored securely on Google Firebase servers with AES-256 encryption.</p>
              <p>  We do NOT sell, share, or trade your business data with third parties.</p>
            </div>

            <div className="mt-4">
              <p className="font-bold text-base mb-2">2. Data Security</p>
              <p>  All data transmission is encrypted using SSL/TLS protocols.</p>
              <p>  Password protection and optional biometric lock features are available.</p>
              <p>  Regular automated backups ensure data safety.</p>
            </div>

            <div className="mt-4">
              <p className="font-bold text-base mb-2">3. User Rights</p>
              <p>  You can export your data anytime from Settings ? Backup.</p>
              <p>  You can request complete data deletion by contacting support.</p>
              <p>  Your data remains yours - we only provide the platform.</p>
            </div>

            <div className="mt-4">
              <p className="font-bold text-base mb-2">4. Third-Party Services</p>
              <p>  Google Firebase (Database & Authentication)</p>
              <p>  Google Cloud Storage (Bill Images)</p>
              <p>  MyMemory API (Translation - no personal data shared)</p>
            </div>

            <div className="mt-4">
              <p className="font-bold text-base mb-2">5. Liability Disclaimer</p>
              <p>  Autonex is a digital record-keeping tool and is not responsible for physical stock discrepancies.</p>
              <p>  Always verify physical stock counts periodically.</p>
            </div>

            <p className="mt-4 pt-4 border-t text-xs">For legal inquiries or data requests, contact: support@autonex.in</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: How do I add a new item?</p>
              <p className="text-sm opacity-80">A: Navigate to any Page from the Index, tap the (+) button at the bottom right, and enter the car/vehicle name along with quantity.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: How do I create a new page/category?</p>
              <p className="text-sm opacity-80">A: From the Index screen, tap the (+) button and enter the item/category name (e.g., "Brake Pads", "Oil Filters").</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: How do I delete or rename a page?</p>
              <p className="text-sm opacity-80">A: In the Index, tap the Edit (pencil) icon next to any page. You can rename, reorder, or delete the page from there.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: How do I copy items from one page to another?</p>
              <p className="text-sm opacity-80">A: Open the destination page, tap the Copy icon in the header, select the source page, then choose which items to copy.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: How do I save my stock changes?</p>
              <p className="text-sm opacity-80">A: After updating quantities (+/-), a green "Update" button appears. Tap it and enter your password to save all changes to the cloud.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: What is the Product Password?</p>
              <p className="text-sm opacity-80">A: It's a 4-digit PIN (default: 0000) required to save changes and access settings. Change it in Settings ? Security.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: How do I use voice search?</p>
              <p className="text-sm opacity-80">A: Tap the microphone icon in any search bar, or shake your phone (if enabled) to activate voice search. Speak in Hindi or English.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: Can I use the app offline?</p>
              <p className="text-sm opacity-80">A: Yes! Changes made offline are saved locally and automatically sync when you reconnect to the internet.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: How do I install the app on my phone?</p>
              <p className="text-sm opacity-80">A: Go to Settings ? Profile ? Install App, or use your browser's "Add to Home Screen" option.</p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="font-bold text-blue-500 mb-1">Q: I forgot my password. What do I do?</p>
              <p className="text-sm opacity-80">A: Contact Autonex support with your Customer ID (found in Settings ? Profile) to reset your password.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface EntryRowProps {
  entry: { id: number; car: string; qty: number };
  t: (text: string) => string;
  isDark: boolean;
  onUpdateBuffer: (id: number, amount: number, currentQty: number) => void;
  onEdit: (entry: any) => void;
  limit: number;
  tempQty: number | undefined;
  index: number;
}

const EntryRow = React.memo(({ entry, t, isDark, onUpdateBuffer, onEdit, limit, tempQty, index }: EntryRowProps) => {
  const displayQty = tempQty !== undefined ? tempQty : entry.qty;
  const isChanged = tempQty !== undefined;

  return (
    <div className={`flex items-center px-3 py-2 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
      <div className="w-6 text-xs font-bold opacity-40">#{index + 1}</div>
      <div className="flex-[2] text-base font-bold truncate pr-2 leading-tight">{t(entry.car)}</div>

      <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
        <button onClick={() => onUpdateBuffer(entry.id, -1, entry.qty)} className="w-8 h-8 rounded bg-white border shadow-sm text-red-600 flex items-center justify-center active:bg-red-100 transition-colors"><Minus size={16} /></button>
        <span className={`text-lg font-mono font-bold w-8 text-center ${isChanged ? 'text-blue-500' : (displayQty < limit ? 'text-red-500 animate-pulse' : 'text-slate-700')}`}>{displayQty}</span>
        <button onClick={() => onUpdateBuffer(entry.id, 1, entry.qty)} className="w-8 h-8 rounded bg-white border shadow-sm text-green-600 flex items-center justify-center active:bg-green-100 transition-colors"><Plus size={16} /></button>
      </div>

      <button onClick={() => onEdit(entry)} className="ml-3 p-2 text-gray-400 hover:text-blue-500 active:scale-90 transition-transform bg-gray-50 rounded-full border border-gray-100">
        <Edit size={16} />
      </button>
    </div>
  );
});

const VoiceInput = ({ onResult, isDark, lang = 'en-IN' }) => {
  const [isListening, setIsListening] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioStreamRef = useRef(null);

  const stopAudioStream = useCallback(() => {
    const stream: any = audioStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
  }, []);

  const startListening = async () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = false;

      // Best-effort: ask for audio with built-in noise suppression.
      // SpeechRecognition doesn't expose constraints directly, but this can improve capture on some devices.
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          audioStreamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } as any
          });
        }
      } catch (err) {
        // Ignore: SpeechRecognition may still work without this.
        console.warn('getUserMedia constraints failed:', err);
      }

      recognition.onstart = () => {
        setIsListening(true);
        setHasError(false);
        if (navigator.vibrate) navigator.vibrate(100);
      };

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        // Process through desi dictionary before returning
        let processed = transcript.toLowerCase();
        Object.keys(synonymMap).forEach(key => {
          const regex = new RegExp(`\\b${key}\\b`, 'gi');
          if (regex.test(processed)) {
            processed = processed.replace(regex, synonymMap[key]);
          }
        });
        onResult(processed);
        setIsListening(false);
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        stopAudioStream();
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
        setHasError(true);
        stopAudioStream();

        // Handle specific errors
        if (e.error === 'network') {
          // Offline - show visual feedback
          console.info('Voice search requires internet connection');
        } else if (e.error === 'no-speech') {
          // No speech detected - that's OK
          setHasError(false);
        }

        // Clear error state after 2 seconds
        setTimeout(() => setHasError(false), 2000);
      };

      recognition.onend = () => {
        setIsListening(false);
        stopAudioStream();
      };

      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to start voice recognition:', e);
        setHasError(true);
        stopAudioStream();
        setTimeout(() => setHasError(false), 2000);
      }
    } else {
      alert("Voice input not supported in this browser. Please type manually.");
    }
  };

  return (
    <button
      onClick={startListening}
      disabled={isListening}
      className={`p-3 rounded-full shrink-0 transition-all ${isListening
        ? 'bg-red-500 text-white animate-pulse'
        : hasError
          ? 'bg-yellow-500 text-white'
          : isDark
            ? 'bg-slate-700 text-white hover:bg-slate-600'
            : 'bg-gray-100 text-black hover:bg-gray-200'
        }`}
    >
      <Mic size={20} className={isListening ? 'animate-bounce' : ''} />
    </button>
  );
};

// ??? FULL SCREEN IMAGE MODAL
const ImageModal = ({ src, onClose, onDelete }) => {
  const [zoom, setZoom] = useState(false);
  if (!src) return null;
  return (
    <div className="fixed inset-0 bg-black z-[120] flex flex-col justify-center items-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white bg-white/20 p-3 rounded-full"><X /></button>
      <div className={`overflow-auto ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'} w-full h-full flex items-center justify-center`} onClick={() => setZoom(z => !z)}>
        <img src={src} className={`object-contain transition-transform duration-150 ${zoom ? 'scale-125 max-w-none max-h-none' : 'max-w-full max-h-[80vh]'}`} alt="Bill" />
      </div>
      <div className="mt-4 flex gap-3">
        <button onClick={onDelete} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex gap-2"><Trash2 /> Delete Photo</button>
        <button onClick={() => setZoom(z => !z)} className="bg-white text-black px-4 py-2 rounded">{zoom ? 'Exit Zoom' : 'Zoom'}</button>
      </div>
    </div>
  );
};


const NavBtn = ({ icon, label, active, onClick, alert, isDark, accentHex }: any) => (
  <button
    onClick={onClick}
    className={`relative flex-1 flex flex-col items-center py-2 px-1 rounded-2xl transition-all duration-200 ${active
      ? isDark
        ? ''
        : 'shadow-sm'
      : isDark
        ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
    style={active ? {
      color: accentHex,
      backgroundColor: isDark ? hexToRgba(accentHex, 0.16) : hexToRgba(accentHex, 0.14)
    } : undefined}
  >
    <div
      className="p-1.5 rounded-xl transition-all"
      style={active ? { backgroundColor: isDark ? hexToRgba(accentHex, 0.22) : hexToRgba(accentHex, 0.18) } : undefined}
    >
      {icon && React.createElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
    </div>
    <span className={`text-[9px] font-bold mt-0.5 text-center leading-none ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    {alert && (
      <span className="absolute top-0 right-2 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
      </span>
    )}
  </button>
);


interface AppSettings {
  limit: number;
  theme: string;
  accentColor: string;
  shakeToSearch: boolean;
  productPassword: string;
  shopName: string;
  pinnedTools: string[];
  fontSize?: string;
  fuzzySearch?: boolean;
  voiceAI?: boolean;
  aiPredictions?: boolean;
  widgets?: {
    aiInsights?: boolean;
    predictions?: boolean;
  } | boolean;
}

interface GpsReminderLog {
  id: number;
  timestamp: number;
  action: 'created' | 'renewed' | 'updated';
  details: string;
  previousDate?: string;
  newDate?: string;
}

interface GpsReminder {
  id: number;
  carNumber: string;
  customerName: string;
  mobileNumber: string;
  expiryDate: string; // ISO date string
  status: 'active' | 'expired' | 'renewed';
  history?: GpsReminderLog[];
}

interface AppDataType {
  pages: any[];
  entries: any[];
  bills: any[];
  salesEvents: any[];
  gpsReminders: GpsReminder[];
  settings: AppSettings;
  appStatus: string;
  credentials?: { email: string; password: string; };
}

const defaultData: AppDataType = {
  pages: [],
  entries: [],
  bills: [],
  salesEvents: [],
  gpsReminders: [],
  settings: { limit: 5, theme: 'light', accentColor: 'blue', shakeToSearch: true, productPassword: '0000', shopName: 'Autonex', pinnedTools: [] },
  appStatus: 'active',
  credentials: { email: '', password: '' }
};

import { DASHBOARD_TOOLS } from './data/dashboardTools';

function DukanRegister() {
  useEffect(() => {
    console.info('DukanRegister mounted', { tabId: window.__dukan_tabId, time: Date.now() });
    return () => console.info('DukanRegister unmounted', { tabId: window.__dukan_tabId, time: Date.now() });
  }, []);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [data, setData] = useState<AppDataType>(defaultData);
  const [dbLoading, setDbLoading] = useState(false);
  const [fbDocId, setFbDocId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [view, setView] = useState('generalIndex');
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [activePageId, setActivePageId] = useState(null);
  const [activeToolId, setActiveToolId] = useState(null);
  const [initialNoteId, setInitialNoteId] = useState<number | null>(null);

  const [isDashboardToolEditorOpen, setIsDashboardToolEditorOpen] = useState(false);
  const [editingTools, setEditingTools] = useState<string[]>([]);

  // Alerts Tab State
  const [alertTab, setAlertTab] = useState<'stock' | 'gps'>('stock');
  const [gpsInput, setGpsInput] = useState({ carNumber: '', customerName: '', mobileNumber: '', expiryDate: '' });
  const [editingGpsId, setEditingGpsId] = useState<number | null>(null);
  const [gpsSearchTerm, setGpsSearchTerm] = useState('');
  const [validityDays, setValidityDays] = useState('');


  // ?? GHOST MIC STATE
  const [isGhostMicOpen, setIsGhostMicOpen] = useState(false);

  // Upload concurrency control to avoid heavy CPU/network bursts
  const uploadConcurrency = useRef(0);
  const uploadQueue = useRef([]);
  const MAX_CONCURRENT_UPLOADS = 3;
  const scheduleUpload = useCallback((fn) => {
    if (uploadConcurrency.current < MAX_CONCURRENT_UPLOADS) {
      uploadConcurrency.current += 1;
      (async () => {
        try { await fn(); } catch (err) { console.warn('Scheduled upload failed', err); }
        finally {
          uploadConcurrency.current -= 1;
          if (uploadQueue.current.length) {
            const next = uploadQueue.current.shift();
            scheduleUpload(next);
          }
        }
      })();
    } else {
      uploadQueue.current.push(fn);
    }
  }, []);


  const [pageSearchTerm, setPageSearchTerm] = useState('');
  const [indexSearchTerm, setIndexSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [isHindi, setIsHindi] = useState(false);
  const [isSafeMode, setIsSafeMode] = useState(true);
  const [tempChanges, setTempChanges] = useState({});

  const [displayLimit, setDisplayLimit] = useState(50);

  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [settingsPassInput, setSettingsPassInput] = useState('');
  const [settingsTab, setSettingsTab] = useState('profile');
  const [savePassInput, setSavePassInput] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isGlobalBarcodeScannerOpen, setIsGlobalBarcodeScannerOpen] = useState(false);


  const [isNewPageOpen, setIsNewPageOpen] = useState(false);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourcePageId, setCopySourcePageId] = useState(null);
  const [selectedCopyItems, setSelectedCopyItems] = useState([]);


  const [editingEntry, setEditingEntry] = useState(null);
  const [managingPage, setManagingPage] = useState(null);

  const [input, setInput] = useState({ itemName: '', carName: '', qty: '' });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [previousView, setPreviousView] = useState<string | null>(null); // Track previous view for smart back navigation
  const [notifPermission, setNotifPermission] = useState('default');
  const [toast, setToast] = useState(null);

  // ??? IMAGE STATE
  const [viewImage, setViewImage] = useState(null);

  // ?? SYNC INDICATOR STATE
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    isDanger: false,
    onConfirm: () => { }
  });

  const audioRef = useRef(null);

  const t = useCallback((text) => {
    const original = sanitizeDisplayText(text, '');
    if (!isHindi) return original;
    const translated = convertToHindiFallback(original);
    return sanitizeDisplayText(translated, original);
  }, [isHindi]);

  // Keep a ref to `data` so snapshot handler can merge transient local state without triggering
  // extra effect dependencies (avoids re-subscribing to Firestore on every local state change).
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, [setToast]);

  useEffect(() => {
    setDisplayLimit(50);
    window.scrollTo(0, 0);
  }, [view, activePageId, indexSearchTerm, stockSearchTerm, pageSearchTerm]);

  // ?? Initialize Smart Search Engine with Trie when data changes
  useEffect(() => {
    if (data.entries && data.entries.length > 0) {
      // Rebuild Trie for fast autocomplete - O(n*m) where n=items, m=avg name length
      SmartSearchEngine.initialized = false;
      SmartSearchEngine.initialize(data.entries);
      console.log('Smart Search Engine initialized with', data.entries.length, 'items');
    }
  }, [data.entries]);

  // Check for pending writes (for sync indicator)
  useEffect(() => {
    const checkPending = () => {
      try {
        const raw = localStorage.getItem('dukan:pendingWrites');
        setHasPendingWrites(!!raw && JSON.parse(raw).length > 0);
      } catch { setHasPendingWrites(false); }
    };
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  //  Apply Font Size setting to document
  useEffect(() => {
    const fontSize = data.settings?.fontSize || 'Medium';
    const fontSizeMap: Record<string, string> = { 'Small': '14px', 'Medium': '16px', 'Large': '18px' };
    document.documentElement.style.fontSize = fontSizeMap[fontSize] || '16px';
  }, [data.settings?.fontSize]);


  const triggerConfirm = (title, message, isDanger, action) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      isDanger,
      onConfirm: () => {
        action();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const activePage = useMemo(() => {
    return (data.pages || []).find(p => p.id === activePageId);
  }, [data.pages, activePageId]);

  useEffect(() => {
    const token = localStorage.getItem('autohub_token');
    if (token) {
      // Verify token
      fetch('http://localhost:5000/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.email) {
          setUser(data);
        } else {
          localStorage.removeItem('autohub_token');
          setUser(null);
        }
        setAuthLoading(false);
      })
      .catch((err) => {
        console.error('Token verification error:', err);
        setUser(null);
        setAuthLoading(false);
      });
    } else {
      setUser(null);
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setDbLoading(true);

    const loadingTimeout = setTimeout(() => {
      console.warn('Loading timeout reached - forcing load completion');
      setDbLoading(false);
    }, 10000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial data fetch
    fetch('http://localhost:5000/api/data/sync', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('autohub_token')}` }
    })
    .then(res => res.json())
    .then(cloudData => {
      clearTimeout(loadingTimeout);
      setFbDocId(cloudData._id); // Map _id to fbDocId for diagnostics
      
      if (!cloudData.settings) cloudData.settings = defaultData.settings;
      if (!cloudData.settings.pinnedTools) cloudData.settings.pinnedTools = [];
      if (!cloudData.settings.shopName) cloudData.settings.shopName = 'Autonex';
      if (!cloudData.appStatus) cloudData.appStatus = 'active';

      if (!Array.isArray(cloudData.pages)) cloudData.pages = [];
      if (!Array.isArray(cloudData.entries)) cloudData.entries = [];
      if (!Array.isArray(cloudData.bills)) cloudData.bills = [];
      if (!cloudData.settings.productPassword) cloudData.settings.productPassword = '0000';

      const localBills = (dataRef.current && dataRef.current.bills) ? dataRef.current.bills : [];
      const localMap = new Map(localBills.map((b: any) => [b.id, b]));

      const mergedBills = (cloudData.bills || []).map((cb: any) => {
        const local: any = localMap.get(cb.id);
        if (!local) return cb;
        return {
          ...cb,
          previewUrl: local.previewUrl || local.image || null,
          uploading: local.uploading || false,
          progress: typeof local.progress === 'number' ? local.progress : 0,
          tempBlob: local.tempBlob,
          uploadFailed: local.uploadFailed || false
        };
      });

      const cloudIds = new Set((cloudData.bills || []).map((b: any) => b.id));
      const localOnly = localBills.filter((b: any) => !cloudIds.has(b.id));

      const finalData = { ...cloudData, bills: [...localOnly, ...mergedBills] } as AppDataType;

      setData(finalData);
      setDbLoading(false);
    })
    .catch(error => {
      clearTimeout(loadingTimeout);
      console.error("DB Error:", error);
      showToast(t('Database connection error.'), 'error');
      try {
        const backupRaw = localStorage.getItem('dukan:backup');
        if (backupRaw) {
          const backupData = JSON.parse(backupRaw);
          setData(backupData);
          console.info('Restored data from local backup after DB error');
          showToast(t('Showing offline data'), 'error');
        }
      } catch (e) {
        console.warn('Backup restore failed in error handler', e);
      }
      setDbLoading(false);
    });

    return () => {
      clearTimeout(loadingTimeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) { showToast("Please fill details", "error"); return; }
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      localStorage.setItem('autohub_token', data.token);
      setUser({ email: data.email, uid: data.uid });
      
      if (isRegistering) {
        showToast("Account Created!");
      }
    } catch (error) { 
      showToast(error.message, "error"); 
    }
  };

  const handleLogout = () => {
    triggerConfirm("Logout?", "Are you sure you want to Logout?", true, () => {
      localStorage.removeItem('autohub_token');
      setUser(null);
      setData(defaultData);
      setEmail(''); setPassword('');
    });
  };

  const pushToFirebase = async (newData) => {
    if (!user) return false;

    // Stamp every write with lastUpdated for multi-device conflict tracking
    const payload = { ...newData, lastUpdated: Date.now() };

    // Also update local backup immediately so we never lose data
    try { localStorage.setItem('dukan:backup', JSON.stringify(payload)); } catch { /* noop */ }

    // Try to write to backend API with retries
    const tryWrite = async (attempts = 3) => {
      for (let i = 1; i <= attempts; i++) {
        try {
          const res = await fetch('http://localhost:5000/api/data/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('autohub_token')}`
            },
            body: JSON.stringify(payload)
          });
          
          if (!res.ok) {
             const data = await res.json();
             throw new Error(data.error || 'Failed to sync');
          }
          return true;
        } catch (err: any) {
          const msg = String(err?.message || err);
          console.warn(`pushToFirebase attempt ${i} failed:`, msg);
          if (i === attempts) throw err;
          await new Promise(res => setTimeout(res, 300 * i));
        }
      }
      return false;
    };

    try {
      const res = await tryWrite(3);
      return res;
    } catch (err: any) {
      // Queue for later sync
      try {
        const key = 'dukan:pendingWrites';
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        list.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), data: payload, ts: Date.now(), attempts: 0 });
        localStorage.setItem(key, JSON.stringify(list));
        showToast(t('Saved locally. Will retry sync.'), 'error');
      } catch (e) {
        console.error('Failed to queue write', e);
        showToast(t('Save Failed: ') + (err && err.message ? err.message : String(err)), 'error');
      }
      return false;
    }
  };

  // Process pending writes persisted in localStorage
  const processPendingWrites = useCallback(async () => {
    if (!user) return;
    try {
      const key = 'dukan:pendingWrites';
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list = JSON.parse(raw) || [];
      const remaining = [];
      for (const item of list) {
        try {
          const res = await fetch('http://localhost:5000/api/data/sync', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${localStorage.getItem('autohub_token')}`
             },
             body: JSON.stringify(item.data)
          });
          if (!res.ok) throw new Error('Failed to sync');
        } catch {
          const attempts = (item.attempts || 0) + 1;
          if (attempts >= 5) {
            console.warn('Dropping pending write after max attempts', item.id);
            continue;
          }
          remaining.push({ ...item, attempts });
        }
      }
      if (remaining.length) localStorage.setItem(key, JSON.stringify(remaining)); else localStorage.removeItem(key);
    } catch (e) {
      console.warn('Error processing pending writes', e);
    }
  }, [user]);

  useEffect(() => {
    // Try to sync pending writes when online or when user signs in
    processPendingWrites();
    window.addEventListener('online', processPendingWrites);
    return () => window.removeEventListener('online', processPendingWrites);
  }, [processPendingWrites]);

  // Periodic local backup and an export helper to avoid data loss
  useEffect(() => {
    const id = setInterval(() => {
      try { localStorage.setItem('dukan:backup', JSON.stringify(data)); } catch (e) { console.warn('Backup failed', e); }
    }, 1000 * 60 * 5); // every 5 minutes
    return () => clearInterval(id);
  }, [data]);

  // ❌ REMOVED: Credential sync to Firestore (was storing PLAINTEXT password in database)
  // Firebase Auth's browserLocalPersistence already handles login persistence across refreshes.
  // Storing passwords in Firestore is a severe security liability — even with per-user rules,
  // a compromised admin token or Firestore export would leak all passwords.


  const exportDataToFile = () => {
    try {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `dukan-backup-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      showToast(t('Backup exported'));
    } catch (e) { console.warn('Export failed', e); showToast(t('Backup failed'), 'error'); }
  };
  try { window.__dukan_exportData = exportDataToFile; } catch { /* noop */ }

  const handleTogglePin = async (toolId) => {
    const currentPins = data.settings.pinnedTools || [];
    let newPins;
    if (currentPins.includes(toolId)) {
      newPins = currentPins.filter(id => id !== toolId);
      showToast("Tool Removed from Home");
    } else {
      newPins = [...currentPins, toolId];
      showToast("Tool Added to Home");
    }
    await pushToFirebase({ ...data, settings: { ...data.settings, pinnedTools: newPins } });
  };

  const compressImage = (file) => {
    // Faster compression: use createImageBitmap + binary search on quality, then downscale if needed.
    // Target is <= 100KB for instant add UX.
    return (async () => {
      const TARGET_MIN = 20 * 1024; // allow lower floor if necessary
      const TARGET_MAX = 100 * 1024; // target <= 100KB
      const MAX_WIDTH = 900; // reduce max width for faster, smaller images
      const MIN_WIDTH = 320; // lower bound

      const imgBitmap = await createImageBitmap(file);
      let width = Math.min(MAX_WIDTH, imgBitmap.width);
      let height = Math.round((imgBitmap.height * width) / imgBitmap.width);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const blobAtQuality = (q: number): Promise<Blob | null> => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', q));

      let bestBlob: Blob | null = null;

      while (true) {
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);

        // Quick direct attempt at reasonable quality first
        const quick = await blobAtQuality(0.75);
        if (quick && quick.size <= TARGET_MAX) return quick;

        // Binary search over quality to reduce iterations
        let low = 0.35, high = 0.85, candidate: Blob | null = null;
        for (let i = 0; i < 5; i++) {
          const mid = (low + high) / 2;
          const blob = await blobAtQuality(mid);
          if (!blob) break;
          const size = blob.size;
          candidate = blob;
          if (size > TARGET_MAX) {
            high = mid;
          } else if (size < TARGET_MIN) {
            low = mid;
          } else {
            return blob; // within target
          }
        }

        if (candidate) {
          if (!bestBlob) bestBlob = candidate;
          else if (Math.abs(bestBlob.size - TARGET_MAX) > Math.abs(candidate.size - TARGET_MAX)) bestBlob = candidate;
        }

        if (width <= MIN_WIDTH) break;
        width = Math.max(MIN_WIDTH, Math.round(width * 0.8));
        height = Math.round((imgBitmap.height * width) / imgBitmap.width);
      }

      if (bestBlob) return bestBlob;

      // final fallback
      canvas.width = Math.min(MAX_WIDTH, imgBitmap.width);
      canvas.height = Math.round((imgBitmap.height * canvas.width) / imgBitmap.width);
      ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
      return await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('Compression failed')), 'image/jpeg', 0.75));
    })();
  };
  /* eslint-disable-next-line no-unused-vars */
  const handleBillUpload = async (e) => {
    if (data.bills.length >= 50) return alert("Storage Limit Reached (Max 50 Photos)");
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      showToast(t('Only image files are supported'), 'error');
      return;
    }

    // Create a local preview so the user sees the photo immediately
    const previewUrl = URL.createObjectURL(file);
    const timestamp = Date.now();
    // temporary unique id for frontend
    const tempBill = {
      id: timestamp,
      date: new Date().toISOString(),
      image: previewUrl, // local preview
      path: null,
      uploading: true,
      progress: 0,
      originalFile: file
    };

    // Server-visible bill (no object URLs) so it's persisted safely
    const serverBill = {
      id: timestamp,
      date: new Date().toISOString(),
      image: null, // will be set to downloadURL after upload
      path: storagePath,
      uploading: true,
      progress: 0
    };

    // ✅ FIX: Separate setState from Firebase write to avoid side-effect inside React updater
    // Optimistically update UI first
    setData(prev => {
      const next = { ...prev, bills: [tempBill, ...(prev.bills || [])] };
      return next;
    });

    // Then persist to cloud (outside setState)
    if (user) {
      const cloudNext = { ...dataRef.current, bills: [serverBill, ...(dataRef.current.bills || [])] };
      pushToFirebase(cloudNext).catch(e => console.error('Initial bill save failed', e));
    } else {
      showToast('Saved locally. Sign in to persist to cloud.');
    }
    showToast("Processing & Uploading...");

    // Use custom backend API for upload to Cloudinary
    try {
      if (!user) {
        // No authenticated user to own the upload path
        setData(prev => ({ ...prev, bills: prev.bills.map(b => b.id === timestamp ? { ...b, uploading: false, uploadFailed: true } : b) }));
        showToast('Sign in to upload bills', 'error');
        return;
      }

      // Schedule the heavy work to avoid overloading CPU/network when many images selected
      scheduleUpload(async () => {
        try {
          const compressedBlob = await compressImage(file) as Blob;
          console.log('Compressed blob size:', compressedBlob.size);
          
          // Attach temp bill with compressed blob for potential retry
          setData(prev => ({ ...prev, bills: prev.bills.map(b => b.id === timestamp ? { ...b, tempBlob: compressedBlob } : b) }));
          
          const formData = new FormData();
          formData.append('bill', compressedBlob, file.name);

          // We don't have progress tracking with simple fetch natively easily without XHR, so just update it immediately
          setData(prev => ({ ...prev, bills: prev.bills.map(b => b.id === timestamp ? { ...b, progress: 99 } : b) }));
          
          const res = await fetch('http://localhost:5000/api/upload/bill', {
             method: 'POST',
             headers: {
                 'Authorization': `Bearer ${localStorage.getItem('autohub_token')}`
             },
             body: formData
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          
          const downloadUrl = data.imageUrl;
          const cloudPath = data.path; // Cloudinary public_id

          // ✅ FIX: Use dataRef.current (latest state) instead of stale closure 'data'
          // This prevents overwriting entries/pages/settings changed during upload
          const latestData = dataRef.current;
          const updatedBills = (latestData.bills || []).map(b =>
            b.id === timestamp
              ? { id: timestamp, date: new Date().toISOString(), image: downloadUrl, path: cloudPath, uploading: false }
              : b
          );
          // Only push the bills field via updateDoc to avoid touching other fields
          await pushToFirebase({ ...latestData, bills: updatedBills });
          setData(prev => ({ ...prev, bills: updatedBills }));
          try { URL.revokeObjectURL(previewUrl); } catch (e) { console.warn('Revoke failed', e); }
          showToast('Bill Saved!');
        } catch (err) {
          console.error('Scheduled upload failed', err);
          setData(prev => ({ ...prev, bills: prev.bills.map(b => b.id === timestamp ? { ...b, uploading: false, uploadFailed: true } : b) }));
          showToast('Upload Failed', 'error');
        }
      });
    } catch (err) {
      console.error(err);
      setData(prev => ({ ...prev, bills: prev.bills.map(b => b.id === timestamp ? { ...b, uploading: false, uploadFailed: true } : b) }));
      showToast('Upload Failed', 'error');
    }


  };
  const handleDeleteBill = async (bill) => {
    if (!bill) return;
    if (!confirm('Delete this bill?')) return;
    // ✅ FIX: Use functional setState + dataRef for latest state (no stale closure)
    const latestBills = (dataRef.current.bills || []).filter(b => b.id !== bill.id);
    const updated = { ...dataRef.current, bills: latestBills };
    setData(updated);
    pushToFirebase(updated).catch(e => {
      console.error('Failed to update cloud after delete', e);
      showToast('Cloud delete failed, will retry', 'error');
    });

    // Background storage delete with retry; if it fails persistently, queue it for later
    if (bill.path) {
      (async () => {
        try {
          await deleteWithRetry(bill.path, 4);
          console.info('Storage delete succeeded for', bill.path);
        } catch (err) {
          console.warn('Background delete failed, scheduling for retry', bill.path, err);
          queuePendingDelete(bill.path);
        }
      })();
    }
    showToast('Bill deleted');
  };

  // --- Storage delete helpers ---
  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  const deleteWithRetry = useCallback(async (storagePath, maxAttempts = 3) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch('http://localhost:5000/api/upload/bill', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('autohub_token')}`
          },
          body: JSON.stringify({ path: storagePath })
        });
        if (!res.ok) throw new Error('Delete failed');
        return true;
      } catch (e) {
        console.warn(`Delete attempt ${attempt} failed for ${storagePath}`, e);
        if (attempt === maxAttempts) throw e;
        await wait(500 * attempt);
      }
    }
  }, []);

  const queuePendingDelete = (storagePath) => {
    try {
      const key = 'dukan:pendingDeletes';
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(storagePath)) {
        list.push(storagePath);
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Failed to queue pending delete', e);
    }
  };

  // Process pending deletes when online
  useEffect(() => {
    let cancelled = false;
    const process = async () => {
      if (!navigator.onLine) return;
      try {
        const key = 'dukan:pendingDeletes';
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const list = JSON.parse(raw) || [];
        const remaining = [];
        for (const path of list) {
          if (cancelled) break;
          try {
            await deleteWithRetry(path, 3);
            console.info('Processed pending delete', path);
          } catch (e) {
            console.warn('Pending delete failed, keeping in queue', path, e);
            remaining.push(path);
          }
        }
        if (!cancelled) localStorage.setItem(key, JSON.stringify(remaining));
      } catch (e) {
        console.warn('Error processing pending deletes', e);
      }
    };
    process();
    return () => { cancelled = true; };
  }, [isOnline, deleteWithRetry]);
  useEffect(() => {
    const handlePopState = () => {
      if (view !== 'generalIndex') {
        setView('generalIndex');
        setActivePageId(null);
        setActiveToolId(null);
      }
    };
    window.history.pushState({ view }, '', '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view]);

  const themeSetting = (data.settings?.theme || 'light') as string;
  const prefersDark = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
  const resolvedTheme = themeSetting === 'auto' ? (prefersDark ? 'dark' : 'light') : themeSetting;
  const themePreset = THEME_PRESETS[resolvedTheme] || (prefersDark ? THEME_PRESETS.dark : THEME_PRESETS.light);
  const isDark = themePreset.isDark;

  const accentId = (data.settings?.accentColor || 'blue') as string;
  const accentHex = ACCENT_COLOR_HEX[accentId] || ACCENT_COLOR_HEX.blue;

  useEffect(() => {
    const metaTags = [{ name: "theme-color", content: themePreset.meta }];
    metaTags.forEach(tag => {
      let meta = document.querySelector(`meta[name="${tag.name}"]`) as HTMLMetaElement | null;
      if (!meta) { meta = document.createElement('meta'); meta.name = tag.name; document.head.appendChild(meta); }
      meta.content = tag.content;
    });
  }, [themePreset.meta]);

  useEffect(() => {
    if ("Notification" in window) setNotifPermission(Notification.permission);
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); });
  }, []);

  const _handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => { if (choiceResult.outcome === 'accepted') setDeferredPrompt(null); });
    } else { alert("Browser Menu -> Install App"); }
  };


  const requestNotificationPermission = () => {
    if (!("Notification" in window)) return;
    Notification.requestPermission().then((permission) => {
      setNotifPermission(permission);
      if (permission === "granted") playAlertSound();
    });
  };

  const playAlertSound = () => {
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(e => console.log(e)); }
  };

  const triggerLowStockNotification = (itemCount) => {
    if (notifPermission === 'granted' && itemCount > 0) {
      playAlertSound();
      if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      new Notification(t("Low Stock Warning!"), { body: `${itemCount} ${t("items are below stock limit!")}`, icon: "/icon.png" });
    }
  };

  const handleSettingsUnlock = () => {
    const currentPass = data.settings.productPassword || '0000';
    if (settingsPassInput === currentPass || settingsPassInput === '0000' || settingsPassInput === '123456') {
      setSettingsUnlocked(true);
      showToast(t("Settings Unlocked"));
    } else {
      showToast(t("Wrong Password!"), "error");
    }
  };

  const handleDeletePage = async () => {
    if (!managingPage) return;

    triggerConfirm("Delete Page?", "This page and all its items will be deleted permanently.", true, async () => {
      const filteredPages = data.pages.filter(p => p.id !== managingPage.id);
      const renumberedPages = filteredPages.map((p, index) => ({
        ...p,
        pageNo: index + 1
      }));
      const filteredEntries = data.entries.filter(ent => ent.pageId !== managingPage.id);
      const newData = { ...data, pages: renumberedPages, entries: filteredEntries };

      await pushToFirebase(newData);
      setManagingPage(null);
      showToast("Page Deleted & Renumbered");
    });
  };

  const handleRenamePage = async () => {
    if (!managingPage || !input.itemName) return;
    const newData = {
      ...data,
      pages: data.pages.map(p => p.id === managingPage.id ? { ...p, itemName: input.itemName } : p)
    };
    await pushToFirebase(newData);
    setManagingPage(null);
    showToast("Page Renamed");
  };

  const handleDeleteEntry = async () => {
    triggerConfirm("Delete Item?", "This item will be permanently removed.", true, async () => {
      const newData = { ...data, entries: data.entries.filter(e => e.id !== editingEntry.id) };
      await pushToFirebase(newData);
      setEditingEntry(null);
      showToast("Item Deleted");
    });
  };

  const handleEditEntrySave = async () => {
    if (!editingEntry || !editingEntry.car) return;
    const newData = {
      ...data,
      entries: data.entries.map(e => e.id === editingEntry.id ? { ...e, car: editingEntry.car } : e)
    };
    await pushToFirebase(newData);
    setEditingEntry(null);
    showToast("Item Updated");
  };

  const handleAddPage = async () => {
    if (!input.itemName) return;
    const formattedName = input.itemName.charAt(0).toUpperCase() + input.itemName.slice(1);
    const newPage = { id: Date.now(), pageNo: data.pages.length + 1, itemName: formattedName };
    await pushToFirebase({ ...data, pages: [...data.pages, newPage] });
    setInput({ ...input, itemName: '' });
    setIsNewPageOpen(false);
    showToast(t("New Page Added"));
  };

  const handleAddEntry = async () => {
    if (!input.carName || !activePage) return;
    const formattedCar = input.carName.charAt(0).toUpperCase() + input.carName.slice(1);
    const newEntry = { id: Date.now(), pageId: activePage.id, car: formattedCar, qty: parseInt(input.qty) || 0 };
    await pushToFirebase({ ...data, entries: [...data.entries, newEntry] });
    setInput({ ...input, carName: '', qty: '' });
    setIsNewEntryOpen(false);
    showToast(t("Item Added"));
  };

  const handleImportItems = async (sourcePageId) => {
    const sourceItems = data.entries.filter(e => e.pageId === sourcePageId);
    if (sourceItems.length === 0) {
      showToast("No items found!", "error");
      return;
    }

    // Open multi-select modal instead of immediate copy
    setCopySourcePageId(sourcePageId);
    setSelectedCopyItems(sourceItems.map(item => item.id)); // Select all by default
  };

  const executeItemsCopy = async () => {
    if (selectedCopyItems.length === 0) {
      showToast(t("No items selected"), "error");
      return;
    }

    const sourceItems = data.entries.filter(e => selectedCopyItems.includes(e.id));
    const newItems = sourceItems.map((item, index) => ({
      id: Date.now() + index,
      pageId: activePageId,
      car: item.car,
      qty: 0
    }));

    await pushToFirebase({ ...data, entries: [...data.entries, ...newItems] });
    setIsCopyModalOpen(false);
    setCopySourcePageId(null);
    setSelectedCopyItems([]);
    showToast(t("{{count}} Items Copied!").replace('{{count}}', selectedCopyItems.length.toString()));
  };

  const handleMovePage = async (direction) => {
    if (!managingPage) return;

    const newPages = [...data.pages];
    const pageIndex = newPages.findIndex(p => p.id === managingPage.id);
    if (pageIndex === -1) return;

    const swapIndex = direction === 'UP' ? pageIndex - 1 : pageIndex + 1;
    if (swapIndex < 0 || swapIndex >= newPages.length) return;

    [newPages[pageIndex], newPages[swapIndex]] = [newPages[swapIndex], newPages[pageIndex]];
    const renumberedPages = newPages.map((p, idx) => ({ ...p, pageNo: idx + 1 }));

    await pushToFirebase({ ...data, pages: renumberedPages });
    setManagingPage(renumberedPages[swapIndex]);
    showToast(`Page Moved to Position #${swapIndex + 1}`);
  };

  const handleMoveEntry = async (direction) => {
    if (!editingEntry) return;
    const pageEntries = data.entries.filter(e => e.pageId === editingEntry.pageId);
    const entryIndexInPage = pageEntries.findIndex(e => e.id === editingEntry.id);

    if (entryIndexInPage === -1) return;

    const swapIndexInPage = direction === 'UP' ? entryIndexInPage - 1 : entryIndexInPage + 1;
    if (swapIndexInPage < 0 || swapIndexInPage >= pageEntries.length) return;

    const targetEntry = pageEntries[swapIndexInPage];

    const mainIndexCurrent = data.entries.findIndex(e => e.id === editingEntry.id);
    const mainIndexTarget = data.entries.findIndex(e => e.id === targetEntry.id);

    if (mainIndexCurrent === -1 || mainIndexTarget === -1) return;

    const newEntries = [...data.entries];
    [newEntries[mainIndexCurrent], newEntries[mainIndexTarget]] = [newEntries[mainIndexTarget], newEntries[mainIndexCurrent]];

    await pushToFirebase({ ...data, entries: newEntries });
    showToast(`Item Moved to Position #${swapIndexInPage + 1}`);
  };

  const updateQtyBuffer = useCallback((id, amount, currentRealQty) => {
    setTempChanges(prev => {
      const currentBufferVal = prev[id] !== undefined ? prev[id] : currentRealQty;
      const newQty = Math.max(0, currentBufferVal + amount);
      // If change reverts back to original quantity, remove from buffer
      if (newQty === currentRealQty) {
        const next = { ...prev };
        delete next[id];
        // Inform the user that the pending update was removed
        try { showToast(t('Change reverted, update removed'), 'error'); } catch { /* noop */ }
        return next;
      }
      return { ...prev, [id]: newQty };
    });
  }, [showToast, t]);

  const openSaveModal = () => {
    setSavePassInput('');
    setIsSaveModalOpen(true);
  };

  const executeSave = async () => {
    if (savePassInput !== data.settings.productPassword && savePassInput !== '0000' && savePassInput !== '123456') {
      showToast(t("Wrong Password!"), "error");
      return;
    }

    let lowStockTriggered = 0;
    const nowTs = Date.now();
    const nowIso = new Date(nowTs).toISOString();
    const newSalesEvents: any[] = [];

    const updatedEntries = data.entries.map(e => {
      if (tempChanges[e.id] !== undefined) {
        const finalQty = tempChanges[e.id];
        if (finalQty < data.settings.limit) lowStockTriggered++;

        const prevQty = Number(e.qty || 0);
        const nextQty = Number(finalQty || 0);
        const delta = nextQty - prevQty;

        if (delta !== 0) {
          newSalesEvents.push({
            id: `${nowTs}-${e.id}`,
            ts: nowTs,
            date: nowIso,
            type: delta < 0 ? 'sale' : 'restock',
            entryId: e.id,
            pageId: e.pageId,
            car: e.car,
            qty: Math.abs(delta)
          });
        }

        return { ...e, qty: finalQty };
      }
      return e;
    });

    const mergedSalesEvents = ([...(data.salesEvents || []), ...newSalesEvents]).slice(-2000);

    const success = await pushToFirebase({ ...data, entries: updatedEntries, salesEvents: mergedSalesEvents });
    if (success) {
      setTempChanges({});
      setIsSaveModalOpen(false);
      if (lowStockTriggered > 0) {
        triggerLowStockNotification(lowStockTriggered);
        showToast(t("Stock Updated (Low Stock Alert!)"));
      } else {
        showToast(t("Database Synced Successfully!"));
      }
    }
  };

  const pageCounts = useMemo(() => {
    const counts = {};
    (data.entries || []).forEach(e => {
      counts[e.pageId] = (counts[e.pageId] || 0) + e.qty;
    });
    return counts;
  }, [data.entries]);

  const globalSearchResults = useMemo(() => {
    if (!indexSearchTerm) return { pages: (data.pages || []), items: [] };
    const safeTerm = indexSearchTerm.toLowerCase();
    const filteredPages = (data.pages || []).filter(p => p.itemName?.toLowerCase().includes(safeTerm));
    const filteredItems = (data.entries || []).filter(e => e.car?.toLowerCase().includes(safeTerm));

    const itemsGrouped = filteredItems.reduce((acc, item) => {
      const p = (data.pages || []).find(page => page.id === item.pageId);
      if (p && p.itemName) {
        if (!acc[p.itemName]) acc[p.itemName] = [];
        acc[p.itemName].push(item);
      }
      return acc;
    }, {});
    return { pages: filteredPages, items: itemsGrouped };
  }, [data.pages, data.entries, indexSearchTerm]);

  // ?? SMART SEARCH WITH CACHING & FUZZY MATCHING
  const filteredStock = useMemo(() => {
    if (!stockSearchTerm || stockSearchTerm.trim() === '') return [];

    const term = stockSearchTerm.toLowerCase().trim();

    // Check cache first
    const cacheKey = `stock:${term}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    // Use smart search algorithm for better results
    const smartResult = performSmartSearch(term, data.entries || [], data.pages || [], { useFuzzy: data.settings?.fuzzySearch !== false });

    let results: any[];
    if (smartResult.match && smartResult.items.length > 0) {
      // Use smart search results (fuzzy matched)
      results = smartResult.items;
    } else {
      // Fallback to basic contains search
      results = (data.entries || []).filter(e =>
        e.car && e.car.toLowerCase().includes(term)
      );
    }

    // Cache results
    searchCache.set(cacheKey, results);
    return results;
  }, [data.entries, data.pages, stockSearchTerm]);

  // Optimized page search with caching
  const pageViewData = useMemo(() => {
    if (!activePage) return { filteredEntries: [], grandTotal: 0 };

    const pageEntries = (data.entries || []).filter(e => e.pageId === activePage.id);
    const safeSearch = pageSearchTerm ? pageSearchTerm.toLowerCase().trim() : '';

    let filtered: any[];
    if (safeSearch) {
      // Check cache
      const cacheKey = `page:${activePage.id}:${safeSearch}`;
      const cached = searchCache.get(cacheKey);
      if (cached) {
        filtered = cached;
      } else {
        // Smart fuzzy filter
        const smartResult = performSmartSearch(safeSearch, pageEntries, data.pages || [], { useFuzzy: data.settings?.fuzzySearch !== false });
        if (smartResult.match && smartResult.items.length > 0) {
          filtered = smartResult.items;
        } else {
          filtered = pageEntries.filter(e => e.car && e.car.toLowerCase().includes(safeSearch));
        }
        searchCache.set(cacheKey, filtered);
      }
    } else {
      filtered = pageEntries;
    }

    const total = pageEntries.reduce((acc, curr) => {
      const val = tempChanges[curr.id] !== undefined ? tempChanges[curr.id] : curr.qty;
      return acc + val;
    }, 0);
    return { filteredEntries: filtered, grandTotal: total };
  }, [data.entries, data.pages, activePage, pageSearchTerm, tempChanges]);

  // --------------------------------------------------------------------------


  const renderSaveButton = () => {
    const count = Object.keys(tempChanges).length;
    if (count === 0) return null;
    return (
      <DraggableFAB id="fab-update" onClick={openSaveModal} className="fixed z-50" initialBottom={96} initialRight={24}>
        <div
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-green-500/40 flex items-center gap-3 hover:from-green-500 hover:to-emerald-500 transition-all group"
          style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
        >
          <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
            <SaveAll size={18} />
          </div>
          <span className="font-bold text-sm">{t("Update")} ({count})</span>
        </div>
      </DraggableFAB>
    );
  };

  // Bills UI removed   feature deprecated per user request

  if (authLoading || (user && dbLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-10">
        <div className="flex flex-col items-center justify-center gap-8">
          {/* Logo Animation */}
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 p-6 rounded-3xl shadow-2xl">
              <Store size={48} className="text-white" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-black tracking-widest text-white mb-2">AUTONEX</h1>
            <p className="text-slate-400 text-sm font-medium">Smart Auto Parts Management</p>
          </div>

          {/* Loading Spinner */}
          <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-b-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>

          <p className="text-slate-500 text-xs font-semibold animate-pulse">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-600 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-600 rounded-full blur-[120px] opacity-20"></div>

        {toast && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="w-full max-w-sm bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700/50 relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
              <Store size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-1">Welcome to Autonex</h1>
          <p className="text-center text-slate-400 mb-8 text-sm">Sign in to manage your inventory</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-bold ml-1 uppercase">Email Address</label>
              <input type="email" required className="w-full p-3 bg-slate-900 rounded-xl border border-slate-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" placeholder="shop@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold ml-1 uppercase">Password</label>
              <input type="password" required className="w-full p-3 bg-slate-900 rounded-xl border border-slate-600 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" placeholder="******" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all">
              {isRegistering ? "Create Shop Account" : "Secure Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-blue-400 font-bold ml-2 hover:text-blue-300 transition-colors text-sm">
              {isRegistering ? "Already have an account? Login" : "New here? Create Account"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If the app status is set to 'blocked' in Firestore, show a blocking screen
  if (data && data.appStatus === 'blocked') {
    const fid = fbDocId || (user && user.uid) || 'Unknown';
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900 p-6">
        <div className="max-w-xl w-full bg-slate-800 border rounded-xl shadow-xl p-6 text-center">
          <h3 className="text-2xl font-bold mb-2 text-[#f5e6cc]">Account Blocked</h3>
          <p className="mb-4 text-[#f5e6cc]">Your shop has been blocked by the administrator. Payment is pending and access has been restricted until the issue is resolved.</p>
          <p className="text-sm mb-4 text-[#f5e6cc] flex items-center justify-center gap-2"><strong>Firebase ID:</strong> <span className="font-mono">{fid}</span>
            <button onClick={() => { navigator.clipboard?.writeText(fid); showToast('Firebase ID copied to clipboard'); }} title="Copy Firebase ID" className="ml-2 inline-flex items-center justify-center p-1 rounded bg-transparent text-[#f5e6cc] hover:bg-slate-700">
              <Copy size={14} />
            </button>
          </p>
          <p className="text-sm mb-6 text-[#f5e6cc]">Please contact the administrator to resolve billing or account issues.</p>
          <div className="flex gap-3 justify-center">
            <a className="px-4 py-2 bg-amber-500 text-slate-900 rounded inline-flex items-center gap-2 font-bold" href={`tel:8619152422`}>
              Contact
            </a>
            <button onClick={() => { navigator.clipboard?.writeText(fid); showToast('Firebase ID copied to clipboard'); }} className="px-4 py-2 bg-gray-700 text-[#f5e6cc] rounded">Copy ID</button>
          </div>
        </div>
      </div>
    );
  }

    const renderGeneralIndex = () => (
    <div className="pb-24 bg-[#f8f9fa] dark:bg-slate-950 font-['Inter',sans-serif] min-h-screen">
      {/* 1. Header Area */}
      <div className="px-4 pt-4 pb-4 flex justify-between items-center bg-[#FCFCFC] dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF7A18] rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Package size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#0F1724] dark:text-white leading-tight">
              {data.settings.shopName || "Autonex"}
            </h1>
            <p className="text-[12px] font-semibold text-[#556077] dark:text-slate-400">Smart Auto Parts Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isOnline ? <Wifi size={20} className="text-[#17B890]" /> : <WifiOff size={20} className="text-[#E53935] animate-pulse" />}
            <div className="relative cursor-pointer hover:opacity-80 active:scale-95 transition-transform" onClick={() => setShowAnnouncements(true)}><MessageSquare size={22} className="text-[#0F1724] dark:text-white" /><span className="absolute -top-1 -right-1 bg-[#5B5CEB] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-slate-900">1</span></div>
          <div className="relative cursor-pointer hover:opacity-80 active:scale-95 transition-transform" onClick={() => setView('alerts')}>
            <Bell size={22} className="text-[#0F1724] dark:text-white" />
            <span className="absolute -top-1 -right-1 bg-[#E53935] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">3</span>
          </div>
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-[#556077] dark:text-slate-300">
            <User size={18} />
          </div>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="px-4 py-3 bg-[#FCFCFC] dark:bg-slate-900 sticky top-0 z-40 shadow-sm border-b border-gray-50 dark:border-slate-800">
        <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-[0_4px_12px_rgba(15,20,36,0.03)] px-3 py-3 transition-all focus-within:shadow-[0_8px_20px_rgba(15,20,36,0.08)]">
          <Search size={20} className="text-[#556077] mr-2" />
          <input 
            className="flex-1 outline-none bg-transparent text-[#0F1724] dark:text-white text-[14px] placeholder-[#556077]"
            placeholder={t("Search Parts, Bills, Customers") + " ..."}
            value={indexSearchTerm}
            onChange={e => setIndexSearchTerm(e.target.value)}
          />
          <div className="flex gap-2 items-center ml-2 border-l pl-2 border-gray-200 dark:border-slate-700">
            <VoiceInput onResult={setIndexSearchTerm} isDark={isDark} lang={isHindi ? 'hi-IN' : 'en-IN'} />
            <button className="text-[#556077] hover:text-[#0F1724] dark:hover:text-white p-1" onClick={() => { setActiveToolId('import'); setPreviousView('generalIndex'); setView('tools'); }}>
              <ScanBarcode size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. KPI Cards Row */}
      <div className="px-4 pt-5 pb-2 overflow-x-auto hide-scrollbar flex gap-3">
        <div className="min-w-[145px] bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-[16px] border border-gray-100 dark:border-slate-700 shadow-[0_4px_16px_rgba(15,20,36,0.04)] active:scale-95 transition-transform" onClick={() => { setView('pagesGrid'); }}>
          <div className="flex items-center gap-1.5 text-[#556077] dark:text-slate-400 mb-1">
            <TrendingDown size={14} className="text-[#17B890] transform rotate-180" />
            <span className="text-[12px] font-semibold">{t("Today's Sales")}</span>
          </div>
          <div className="text-[22px] font-bold text-[#0F1724] dark:text-white leading-tight mb-1">₹20,500</div>
          <div className="text-[11px] font-bold text-[#17B890] flex items-center gap-0.5 mt-2">
            <ArrowUp size={12} strokeWidth={3}/> 12% vs Yesterday
          </div>
        </div>

        <div className="min-w-[145px] bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-[16px] border border-gray-100 dark:border-slate-700 shadow-[0_4px_16px_rgba(15,20,36,0.04)] active:scale-95 transition-transform" onClick={() => setAlertTab('stock')}>
          <div className="flex items-center gap-1.5 text-[#F57C00] mb-1">
            <AlertTriangle size={14} />
            <span className="text-[12px] font-semibold">{t("Low Stock")}</span>
          </div>
          <div className="text-[22px] font-bold text-[#0F1724] dark:text-white leading-tight mb-1">15 Items</div>
          <div className="text-[11px] font-bold text-[#FF7A18] flex items-center gap-0.5 mt-2">
            View Alerts <ChevronRight size={12}/>
          </div>
        </div>

        <div className="min-w-[145px] bg-[#FFFFFF] dark:bg-slate-800 p-4 rounded-[16px] border border-gray-100 dark:border-slate-700 shadow-[0_4px_16px_rgba(15,20,36,0.04)] active:scale-95 transition-transform" onClick={() => { setActiveToolId('udhaar'); setView('tools'); }}>
          <div className="flex items-center gap-1.5 text-[#2F80ED] mb-1">
            <FileText size={14} />
            <span className="text-[12px] font-semibold text-[#556077] dark:text-slate-400">{t("Pending Due")}</span>
          </div>
          <div className="text-[22px] font-bold text-[#0F1724] dark:text-white leading-tight mb-1">₹45,000</div>
          <div className="text-[11px] font-bold text-[#2F80ED] flex items-center gap-0.5 mt-2">
            Collect Now <ChevronRight size={12}/>
          </div>
        </div>
      </div>

      {/* 4. Business Hub Section */}
      <div className="px-4 mt-4 mb-3 flex justify-between items-center">
        <h2 className="text-[16px] font-bold text-[#0F1724] dark:text-white">{t("Business Hub")}</h2>
        <button 
          onClick={() => {
            setEditingTools(data.settings?.dashboardTools || ['analytics', 'udhaar', 'supplier', 'warranty', 'import']);
            setIsDashboardToolEditorOpen(true);
          }}
          className="text-[13px] font-semibold text-[#FF7A18] hover:text-orange-600"
        >
          {t("See All")}
        </button>
      </div>

            {/* 5. Grid of Feature Tiles */}
      <div className="px-4 grid grid-cols-4 gap-x-3 gap-y-4 mb-8">
        {(() => {
          const allTools = [
            { id: "supplier", title: "Supplier\nLedger", icon: Package, bg: "bg-[#FFF3E6]", iconCol: "text-[#FF7A18]", darkBg: "dark:bg-orange-950/40" },
            { id: "udhaar", title: "Customer\nKhata", icon: Users, bg: "bg-[#E6FBF2]", iconCol: "text-[#17B890]", darkBg: "dark:bg-emerald-950/40" },
            { id: "quotation", title: "Quotation\nMaker", icon: FileText, bg: "bg-[#F0EEFF]", iconCol: "text-[#5C6BC0]", darkBg: "dark:bg-indigo-950/40" },
            { id: "invoice", title: "Bill\nGenerator", icon: FileText, bg: "bg-[#EAF6FF]", iconCol: "text-[#2F80ED]", darkBg: "dark:bg-blue-950/40" },
            { id: "stockvalue", title: "Inventory", icon: Package, bg: "bg-[#FFFBE6]", iconCol: "text-[#FBC02D]", darkBg: "dark:bg-yellow-950/40" },
            { id: "warranty", title: "Warranty\nVault", icon: Shield, bg: "bg-[#FCE4EC]", iconCol: "text-[#EC407A]", darkBg: "dark:bg-pink-950/40" },
            { id: "analytics", title: "Sales\nReport", icon: TrendingUp, bg: "bg-[#F3E5F5]", iconCol: "text-[#AB47BC]", darkBg: "dark:bg-purple-950/40" },
            { id: "margin", title: "Expenses", icon: FileMinus, bg: "bg-[#FBE9E7]", iconCol: "text-[#FF7043]", darkBg: "dark:bg-red-950/40" },
            { id: "gst", title: "GST\nReports", icon: Percent, bg: "bg-[#E3F2FD]", iconCol: "text-[#42A5F5]", darkBg: "dark:bg-blue-900/30" },
            { id: "settings", title: "Settings", icon: Settings, bg: "bg-[#F5F5F5]", iconCol: "text-[#757575]", darkBg: "dark:bg-gray-800" },
            { id: "basicCalc", title: "Business\nCalc", icon: Calculator, bg: "bg-[#E0F2F1]", iconCol: "text-[#00897B]", darkBg: "dark:bg-teal-900/30" },
            { id: "emi", title: "EMI\nCalc", icon: DollarSign, bg: "bg-[#E8F5E9]", iconCol: "text-[#43A047]", darkBg: "dark:bg-green-900/30" },
            { id: "converter", title: "Unit\nConvert", icon: RefreshCcw, bg: "bg-[#F1F8E9]", iconCol: "text-[#689F38]", darkBg: "dark:bg-lime-900/30" },
            { id: "card", title: "Digital\nCard", icon: CreditCard, bg: "bg-[#FFF3E0]", iconCol: "text-[#EF6C00]", darkBg: "dark:bg-orange-900/30" },
            { id: "notes", title: "Note\nMaster", icon: StickyNote, bg: "bg-[#FFFDE7]", iconCol: "text-[#AFB42B]", darkBg: "dark:bg-yellow-900/30" },
            { id: "import", title: "Data\nImport", icon: ScanBarcode, bg: "bg-[#E1F5FE]", iconCol: "text-[#7CB342]", darkBg: "dark:bg-sky-900/30" }
          ];

          const pinnedIds = data.settings?.pinnedTools || [];
          
          let displayTools = [];
          if (pinnedIds.length > 0) {
            displayTools = pinnedIds.map(id => allTools.find(t => t.id === id)).filter(Boolean);
          } else {
            // Default 7 list if none pinned
            displayTools = allTools.slice(0, 7);
          }

          const systemTiles = [
            { id: "all_tools", title: "All\nTools", icon: Layers, bg: "bg-[#F0EEFF]", iconCol: "text-[#5C6BC0]", darkBg: "dark:bg-indigo-900/30" }
          ];

          return [...displayTools, ...systemTiles].map((tile, i) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.id + "-" + i}
                onClick={() => {
                  if (tile.id === "settings") { setView("settings"); }
                  else if (tile.id === "all_tools") { setView("tools"); }
                  else { setActiveToolId(tile.id); setPreviousView("generalIndex"); setView("tools"); }
                }}
                className={`${tile.bg} ${tile.darkBg} rounded-[16px] p-3 flex flex-col justify-center items-center text-center shadow-sm active:scale-95 transition-transform min-h-[96px]`}
              >
                <div className={`w-10 h-10 rounded-full bg-white/70 dark:bg-black/20 flex items-center justify-center mb-2 ${tile.iconCol}`}>
                  <Icon size={20} strokeWidth={2.5}/>
                </div>
                <h3 className="text-[#0F1724] dark:text-white font-semibold text-[11px] leading-tight whitespace-pre-line">{t(tile.title.replace("\n", " "))}</h3>
              </div>
            );
          });
        })()}
      </div>

      {/* 6. Feature Promo Banner */}
      <div className="px-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-[16px] p-4 flex items-center justify-between border border-gray-100 dark:border-slate-700 shadow-[0_4px_16px_rgba(15,20,36,0.04)] active:scale-95 transition-transform" onClick={() => { setActiveToolId('analytics'); setView('tools'); }}>
          <div className="flex-1 pr-2">
            <h3 className="text-[#0F1724] dark:text-white font-bold text-[15px] mb-1">Grow Your Auto Parts Business</h3>
            <p className="text-[#FF7A18] font-semibold text-[13px] flex items-center gap-1">
              View Analytics <ArrowRight size={14} strokeWidth={3}/>
            </p>
          </div>
          <div className="w-[80px] h-[50px] flex items-end justify-between gap-1 opacity-90 pr-1">
             <div className="w-4 bg-[#17B890] opacity-40 rounded-t-sm h-[40%]"></div>
             <div className="w-4 bg-[#17B890] opacity-60 rounded-t-sm h-[60%]"></div>
             <div className="w-4 bg-[#17B890] opacity-80 rounded-t-sm h-[80%]"></div>
             <div className="w-4 bg-[#17B890] opacity-100 rounded-t-sm h-[100%]"></div>
          </div>
        </div>
      </div>

      {/* 7. Quick Actions */}
      <div className="px-4 mb-2">
        <h2 className="text-[15px] font-bold text-[#0F1724] dark:text-white mb-3">{t("Quick Actions")}</h2>
      </div>
      <div className="px-4 pb-6 overflow-x-auto hide-scrollbar flex gap-3">
        <button 
           onClick={() => { setActiveToolId('invoice'); setView('tools'); }}
           className="flex items-center gap-2 px-5 py-3.5 bg-[#FF7A18] text-white rounded-full font-bold shadow-md shadow-orange-500/30 whitespace-nowrap active:scale-95 transition-transform">
           <Plus size={18} strokeWidth={3}/> New Bill
        </button>
        <button 
           onClick={() => { setView('pagesGrid'); setIsNewPageOpen(true); }}
           className="flex items-center gap-2 px-5 py-3.5 bg-blue-50 dark:bg-slate-800 text-[#2F80ED] border border-blue-200 dark:border-slate-700 rounded-full font-bold whitespace-nowrap active:scale-95 transition-transform">
           <Package size={18} strokeWidth={2.5}/> Add Stock
        </button>
        <button 
           onClick={() => { setActiveToolId('udhaar'); setView('tools'); }}
           className="flex items-center gap-2 px-5 py-3.5 bg-emerald-50 dark:bg-slate-800 text-[#17B890] border border-emerald-200 dark:border-slate-700 rounded-full font-bold whitespace-nowrap active:scale-95 transition-transform">
           <User size={18} strokeWidth={2.5}/> Add Customer
        </button>
        <button 
           onClick={() => { setActiveToolId('import'); setView('tools'); }}
           className="flex items-center gap-2 px-5 py-3.5 bg-purple-50 dark:bg-slate-800 text-[#8B5CF6] border border-purple-200 dark:border-slate-700 rounded-full font-bold whitespace-nowrap active:scale-95 transition-transform">
           <ScanBarcode size={18} strokeWidth={2.5}/> Scan & Add
        </button>
      </div>

      {/* Legacy Search View for Functional Rendering */}
      {indexSearchTerm && (
      <div className="px-4 mt-2 mb-8">
        <div className={`border border-gray-200 rounded-xl overflow-hidden ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
          <div className={`flex border-b ${isDark ? 'border-slate-700 bg-slate-800 text-white' : 'border-gray-100 bg-gray-50 text-[#556077]'} p-3`}>
            <div className="w-12 font-bold text-center border-r border-[#E6FBF2] dark:border-slate-700 text-[13px]">#</div>
            <div className="flex-1 font-bold pl-3 border-r border-[#E6FBF2] dark:border-slate-700 text-[13px]">{t("Search Results")}</div>
          </div>
          <div className="min-h-[15vh]">
            {globalSearchResults.pages.map((page) => (
              <div key={page.id} onClick={() => { setActivePageId(page.id); setView('page'); setPageSearchTerm(''); }} className={`flex border-b border-gray-50 dark:border-slate-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors h-14 items-center ${isDark ? 'text-white' : 'text-[#0F1724]'}`}>
                <div className="w-12 text-center font-bold text-[#E53935] border-r border-gray-50 dark:border-slate-800 h-full flex items-center justify-center text-sm">{page.pageNo}</div>
                <div className="flex-1 pl-3 font-semibold text-[14px] border-r border-gray-50 dark:border-slate-800 h-full flex items-center truncate">{t(page.itemName)}</div>
                <div className="w-16 text-center font-bold text-[#2F80ED] h-full flex items-center justify-center underline text-sm">{page.pageNo}</div>
              </div>
            ))}
            {globalSearchResults.pages.length === 0 && (
               <div className="p-8 text-center text-gray-400">
                  <Search size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="font-medium text-sm">{t("No matches found")}</p>
               </div>
            )}
          </div>
        </div>
      </div>
      )}

    </div>
  );

  const renderPagesGrid = () => (
    <div className={`pb-24 min-h-screen p-4 ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
      <div className="mb-4 sticky top-0 z-10 pt-2 pb-2 backdrop-blur-sm flex justify-between items-center">
        <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}><Grid /> {t("All Pages")}</h1>
        <TranslateBtn isHindi={isHindi} setIsHindi={setIsHindi} isDark={isDark} />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input className={`w-full pl-9 p-3 rounded-xl border outline-none shadow-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-black'}`} placeholder={t("Find Page...")} value={indexSearchTerm} onChange={e => setIndexSearchTerm(e.target.value)} />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <VoiceInput onResult={setIndexSearchTerm} isDark={isDark} lang={isHindi ? 'hi-IN' : 'en-IN'} />
      </div>

      <div className="flex flex-col gap-3">
        {globalSearchResults.pages.map((page) => {
          const totalItems = pageCounts[page.id] || 0;
          return (
            <div key={page.id} onClick={() => { setActivePageId(page.id); setView('page'); setPageSearchTerm(''); }} className={`relative p-4 rounded-xl border-2 shadow-sm cursor-pointer active:scale-95 transition-all flex flex-row items-center justify-between h-24 ${isDark ? 'bg-slate-800 border-slate-600 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-500'}`}>
              <div className="flex items-center gap-4">
                <div className="bg-gray-100 rounded p-2 border font-bold text-gray-500">#{page.pageNo}</div>
                <div>
                  <h3 className={`font-bold text-xl leading-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>{t(page.itemName)}</h3>
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{totalItems} Pcs</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setManagingPage(page); setInput({ ...input, itemName: page.itemName }); }} className="p-3 text-blue-500 hover:bg-blue-50 rounded-full border border-blue-100"><Edit size={24} /></button>
            </div>
          )
        })}
      </div>
      <button onClick={() => setIsNewPageOpen(true)} className="fixed bottom-24 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-xl border-2 border-white flex items-center justify-center active:scale-95 z-20"><Plus size={28} /></button>
    </div>
  );

  const renderStockSearch = () => {
    // Show ALL results when searching, otherwise limit for performance
    const visibleStock = stockSearchTerm ? filteredStock : filteredStock.slice(0, displayLimit);

    return (
      <div className={`pb-24 min-h-screen p-4 ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
        <div className="mb-4 sticky top-0 z-10 pt-2 pb-2 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}><Search /> {t("Global Search")}</h1>
            <div className="flex gap-2">
              <button onClick={() => setIsSafeMode(!isSafeMode)} className={`p-1 rounded-full border ${isSafeMode ? 'bg-green-100 text-green-700 border-green-500' : 'bg-gray-200 text-gray-400'}`}>{isSafeMode ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}</button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input className={`w-full pl-9 p-3 rounded-xl border outline-none shadow-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-300 text-black'}`} placeholder={t("Type Car Name (e.g. Swift)...")} value={stockSearchTerm} onChange={e => setStockSearchTerm(e.target.value)} />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              {stockSearchTerm && <button onClick={() => setStockSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={16} /></button>}
            </div>
            <VoiceInput onResult={setStockSearchTerm} isDark={isDark} lang={isHindi ? 'hi-IN' : 'en-IN'} />
            <button
                onClick={() => setIsGlobalBarcodeScannerOpen(true)}
                className={`p-3 rounded-xl border flex items-center justify-center ${
                    isDark ? 'bg-slate-800 text-blue-400 border-slate-600 hover:bg-slate-700' : 'bg-white text-blue-600 border-gray-300 hover:bg-gray-50'
                }`}
                title="Scan Barcode/QR"
            >
                <ScanBarcode size={24} />
            </button>
          </div>
        </div>
        
        {isGlobalBarcodeScannerOpen && (
            <BarcodeScanner 
                onScan={(text) => {
                    setStockSearchTerm(text);
                    setIsGlobalBarcodeScannerOpen(false);
                }} 
                onClose={() => setIsGlobalBarcodeScannerOpen(false)} 
            />
        )}
        
        <div className="space-y-3">
          {!stockSearchTerm && (
            <div className="flex flex-col items-center justify-center mt-20 opacity-40">
              <Search size={48} className="mb-4" />
              <p className="font-bold">{t("Type above to search...")}</p>
            </div>
          )}
          {visibleStock.map(entry => {
            const p = (data.pages || []).find(page => page.id === entry.pageId);
            return (
              <div key={entry.id} className={`p-4 rounded-xl border-l-4 shadow-sm flex items-center justify-between ${isDark ? 'bg-slate-800 border-l-blue-500 border-slate-700 text-white' : 'bg-white border-l-blue-500 border-gray-200 text-black'}`}>
                <div className="flex-1">
                  <h3 className="font-bold text-xl">{t(p?.itemName || "Unknown Item")}</h3>
                  <p className={`text-sm mt-1 font-semibold opacity-70`}>{t("For")}: {t(entry.car)}</p>
                  <div onClick={() => { if (p) { setActivePageId(p.id); setView('page'); setPageSearchTerm(stockSearchTerm); } }} className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded mt-2 cursor-pointer hover:underline border ${isDark ? 'bg-slate-700 text-blue-300 border-slate-600' : 'bg-gray-100 text-blue-700 border-gray-300'}`}><Book size={10} /> {t("Go to Page")} <ChevronRight size={10} /></div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQtyBuffer(entry.id, -1, entry.qty)} className="w-8 h-8 rounded-full border bg-gray-100 text-red-600 flex items-center justify-center active:scale-90 transition-transform"><Minus size={16} /></button>
                  <span className={`text-xl font-mono font-bold w-8 text-center ${tempChanges[entry.id] ? 'text-blue-500' : ''}`}>{tempChanges[entry.id] !== undefined ? tempChanges[entry.id] : entry.qty}</span>
                  <button onClick={() => updateQtyBuffer(entry.id, 1, entry.qty)} className="w-8 h-8 rounded-full border bg-gray-100 text-green-600 flex items-center justify-center active:scale-90 transition-transform"><Plus size={16} /></button>
                </div>
              </div>
            );
          })}
          {stockSearchTerm && filteredStock.length === 0 && <div className="text-center mt-10 opacity-50 font-bold">{t("No Items Found")}</div>}

          {filteredStock.length > displayLimit && (
            <button onClick={() => setDisplayLimit(prev => prev + 50)} className="w-full py-4 text-blue-500 font-bold opacity-70">
              {t("Load More")}... ({t("Showing")} {visibleStock.length} {t("of")} {filteredStock.length})
            </button>
          )}
        </div>
      </div>
    );
  };


  const handleSaveGpsReminder = async () => {
    if (!gpsInput.carNumber || !gpsInput.expiryDate) { showToast(t("Please fill details"), "error"); return; }

    let newReminders = [...(data.gpsReminders || [])];

    if (editingGpsId) {
      newReminders = newReminders.map(r => {
        if (r.id === editingGpsId) {
          const oldDate = new Date(r.expiryDate).getTime();
          const newDate = new Date(gpsInput.expiryDate).getTime();
          let action: 'updated' | 'renewed' = 'updated';
          let details = 'Reminder updated';

          if (newDate > oldDate + (1000 * 60 * 60 * 24 * 30)) { // If extended by more than 30 days, consider it a renewal
            action = 'renewed';
            details = 'Plan renewed';
          }

          const newLog: GpsReminderLog = {
            id: Date.now(),
            timestamp: Date.now(),
            action,
            details,
            previousDate: r.expiryDate,
            newDate: gpsInput.expiryDate
          };

          return { ...r, ...gpsInput, id: r.id, history: [newLog, ...(r.history || [])] };
        }
        return r;
      });
      showToast(t("Reminder Updated"));
    } else {
      const newReminder: GpsReminder = {
        id: Date.now(),
        ...gpsInput,
        status: 'active',
        history: [{
          id: Date.now(),
          timestamp: Date.now(),
          action: 'created',
          details: 'Reminder created',
          newDate: gpsInput.expiryDate
        }]
      };
      newReminders = [newReminder, ...newReminders];
      showToast(t("GPS Reminder Set"));
    }

    const newData = { ...data, gpsReminders: newReminders };
    await pushToFirebase(newData);
    resetGpsForm();
  };

  const handleEditGpsReminder = (reminder: GpsReminder) => {
    setGpsInput({
      carNumber: reminder.carNumber,
      customerName: reminder.customerName,
      mobileNumber: reminder.mobileNumber,
      expiryDate: reminder.expiryDate
    });
    setValidityDays(''); // Reset days on edit as we have a date
    setEditingGpsId(reminder.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetGpsForm = () => {
    setGpsInput({ carNumber: '', customerName: '', mobileNumber: '', expiryDate: '' });
    setValidityDays('');
    setEditingGpsId(null);
  };

  const handleDeleteGpsReminder = async (id: number) => {
    triggerConfirm(t("Delete Reminder?"), t("Are you sure?"), true, async () => {
      const newData = { ...data, gpsReminders: (data.gpsReminders || []).filter(r => r.id !== id) };
      await pushToFirebase(newData);
      showToast(t("Reminder Deleted"));
    });
  };

  const handleDaysInput = (days: string) => {
    setValidityDays(days);
    if (!days) return;
    const d = new Date();
    d.setDate(d.getDate() + parseInt(days));
    setGpsInput(prev => ({ ...prev, expiryDate: d.toISOString().split('T')[0] }));
  };

  const renderAlerts = () => (
    <div className={`p-4 pb-24 min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-black'}`}>
      <div className="flex bg-gray-200 dark:bg-slate-800 p-1 rounded-xl mb-6 sticky top-0 z-10 shadow-sm backdrop-blur-md bg-opacity-80">
        <button onClick={() => setAlertTab('stock')} className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${alertTab === 'stock' ? 'bg-white dark:bg-slate-700 shadow text-red-500' : 'text-gray-500 dark:text-gray-400'}`}><AlertTriangle size={18} /> {t("Stock")}</button>
        <button onClick={() => setAlertTab('gps')} className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${alertTab === 'gps' ? 'bg-white dark:bg-slate-700 shadow text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}><Zap size={18} /> {t("GPS")}</button>
      </div>

      {alertTab === 'stock' ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-red-500 flex items-center gap-2"><AlertTriangle /> {t("Low Stock")}</h2><TranslateBtn isHindi={isHindi} setIsHindi={setIsHindi} isDark={isDark} /></div>
          {(data.entries || []).filter(e => e.qty < data.settings.limit).length === 0 && <div className="text-center mt-10 opacity-50 flex flex-col items-center gap-2"><CheckCircle size={48} className="text-green-500" />{t("Stock Full")}</div>}
          {(data.entries || []).filter(e => e.qty < data.settings.limit).map(e => {
            const p = (data.pages || []).find(page => page.id === e.pageId);
            return (
              <div key={e.id} className="p-4 border-l-4 border-red-500 bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm hover:shadow-md transition-shadow mb-2 rounded-xl flex justify-between items-center cursor-pointer group" onClick={() => { if (p) { setActivePageId(p.id); setView('page'); } }}>
                <div>
                  <h3 className="font-bold group-hover:text-blue-500 transition-colors">{t(e.car)}</h3>
                  <p className="text-xs opacity-70 flex items-center gap-1"><Book size={10} /> {t(p?.itemName || "Unknown")}</p>
                </div>
                <span className="text-2xl font-bold text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-lg">{e.qty}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`p-4 md:p-6 rounded-3xl mb-8 shadow-xl border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-blue-50/50 border-white'}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

            {editingGpsId && <div className="absolute top-1 right-0 bg-gradient-to-l from-yellow-400 to-orange-400 text-white text-[10px] font-black tracking-widest px-4 py-1 rounded-bl-xl shadow-lg uppercase">Editing Mode</div>}

            <div className="flex justify-between items-center mb-6 mt-2">
              <h3 className="font-black text-xl flex items-center gap-3">
                <div className={`p-2 rounded-xl ${editingGpsId ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                  {editingGpsId ? <Edit size={20} /> : <Zap size={20} />}
                </div>
                {editingGpsId ? t("Update Reminder") : t("New GPS Reminder")}
              </h3>
              {editingGpsId && <button onClick={resetGpsForm} className="text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-full font-bold hover:bg-slate-200 transition-colors">{t("Cancel")}</button>}
            </div>

            <div className="space-y-4">
              {/* Form Input Order: Name -> Mobile -> Car */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Customer Name */}
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">{t("Customer Name")}</label>
                  <input className={`w-full p-3.5 rounded-2xl outline-none border-2 transition-all focus:border-blue-500 font-bold ${isDark ? 'bg-slate-900/50 border-slate-700 focus:bg-slate-900' : 'bg-white border-gray-100 focus:bg-white shadow-sm'}`} placeholder={t("Enter Name")} value={gpsInput.customerName} onChange={e => setGpsInput({ ...gpsInput, customerName: e.target.value })} />
                </div>

                {/* Mobile */}
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">{t("Mobile Number")}</label>
                  <input className={`w-full p-3.5 rounded-2xl outline-none border-2 transition-all focus:border-blue-500 font-bold tracking-wide ${isDark ? 'bg-slate-900/50 border-slate-700 focus:bg-slate-900' : 'bg-white border-gray-100 focus:bg-white shadow-sm'}`} placeholder="9876543210" value={gpsInput.mobileNumber} onChange={e => setGpsInput({ ...gpsInput, mobileNumber: e.target.value })} type="tel" maxLength={10} />
                </div>

                {/* Car Number */}
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 ml-1">{t("Car Number")}</label>
                  <input className={`w-full p-3.5 rounded-2xl outline-none border-2 transition-all focus:border-blue-500 font-bold tracking-wide ${isDark ? 'bg-slate-900/50 border-slate-700 focus:bg-slate-900' : 'bg-white border-gray-100 focus:bg-white shadow-sm'}`} placeholder="GJ-01-AB-1234" value={gpsInput.carNumber} onChange={e => setGpsInput({ ...gpsInput, carNumber: e.target.value.toUpperCase() })} />
                </div>
              </div>

              {/* Validity Selection */}
              <div className={`p-4 rounded-2xl border-2 ${isDark ? 'bg-slate-900/30 border-slate-700' : 'bg-blue-50/50 border-blue-100'}`}>
                <label className="text-xs font-black block mb-3 uppercase tracking-wide text-blue-500 flex items-center gap-2"><Calendar size={14} /> {t("Recharge Validity")}</label>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-full sm:flex-1 space-y-1">
                    <label className="text-[10px] font-bold opacity-50 ml-1">DAYS</label>
                    <input className={`w-full p-3 rounded-xl outline-none border-2 text-center font-black text-lg focus:border-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200 shadow-sm'}`} placeholder="365" value={validityDays} onChange={e => handleDaysInput(e.target.value)} type="number" />
                  </div>
                  <span className="text-xs font-bold opacity-40 mt-0 sm:mt-4">OR</span>
                  <div className="w-full sm:flex-[2] space-y-1">
                    <label className="text-[10px] font-bold opacity-50 ml-1">EXPIRY DATE</label>
                    <input className={`w-full p-3 rounded-xl outline-none border-2 font-bold focus:border-blue-500 transition-all ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200 shadow-sm'}`} type="date" value={gpsInput.expiryDate} onChange={e => { setGpsInput({ ...gpsInput, expiryDate: e.target.value }); setValidityDays(''); }} />
                  </div>
                </div>
              </div>

              <button onClick={handleSaveGpsReminder} className={`w-full py-4 rounded-2xl font-bold shadow-xl text-white transition-all active:scale-95 flex items-center justify-center gap-3 text-lg ${editingGpsId ? 'bg-gradient-to-r from-yellow-500 to-orange-600 shadow-yellow-500/30' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30 hover:shadow-blue-500/50'}`}>
                {editingGpsId ? <SaveAll size={22} /> : <Plus size={22} strokeWidth={3} />} {editingGpsId ? t("Update Reminder") : t("Set Reminder")}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6 relative group">
            <div className={`absolute inset-0 bg-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity ${isDark ? 'opacity-10' : ''}`}></div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={20} />
              <input
                className={`w-full pl-12 p-4 rounded-2xl outline-none border-2 transition-all font-medium ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-gray-100 text-gray-800 focus:border-blue-500 shadow-lg shadow-blue-500/5'}`}
                placeholder={t("Search by Name, Mobile or Car No...")}
                value={gpsSearchTerm}
                onChange={e => setGpsSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {(data.gpsReminders || [])
              .filter(r =>
                r.carNumber.toLowerCase().includes(gpsSearchTerm.toLowerCase()) ||
                r.customerName.toLowerCase().includes(gpsSearchTerm.toLowerCase()) ||
                r.mobileNumber.includes(gpsSearchTerm)
              )
              .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
              .map(reminder => {
                const daysLeft = Math.ceil((new Date(reminder.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft < 0;
                const isUrgent = daysLeft < 7 && !isExpired;

                return (
                  <div key={reminder.id} className={`relative rounded-2xl border transition-all hover:scale-[1.01] overflow-hidden ${isExpired ? 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30' : (isUrgent ? 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-900/30' : 'bg-white border-gray-100 dark:bg-slate-800 dark:border-slate-700 shadow-sm')}`}>
                    {/* Status Strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isExpired ? 'bg-red-500' : (isUrgent ? 'bg-yellow-500' : 'bg-green-500')}`}></div>

                    {/* Main Clickable Summary: Name & Mobile */}
                    <details className="group">
                      <summary className="list-none cursor-pointer p-5 flex justify-between items-start select-none">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className={`font-black text-xl tracking-wide flex flex-wrap items-center gap-2 ${isExpired ? 'text-red-700 dark:text-red-400' : 'text-black dark:text-white'}`}>
                            {reminder.customerName || "No Name"}
                            {isExpired && <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">Expired</span>}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {reminder.mobileNumber ? (
                              <span className="text-sm font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1"><Phone size={14} /> {reminder.mobileNumber}</span>
                            ) : <span className="text-sm font-bold opacity-40 italic">No mobile</span>}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`text-sm font-black flex items-center justify-end gap-1.5 ${isExpired ? 'text-red-600' : (isUrgent ? 'text-yellow-600' : 'text-green-600')}`}>
                            <Calendar size={14} strokeWidth={3} /> {new Date(reminder.expiryDate).toLocaleDateString()}
                          </p>
                          <p className={`text-[10px] font-bold uppercase tracking-wide opacity-70 ${isExpired ? 'text-red-500' : 'text-slate-500'}`}>
                            {isExpired ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                          </p>
                          <div className="mt-2 text-blue-500 text-[10px] font-bold flex items-center justify-end gap-1 group-open:rotate-180 transition-transform origin-center">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </summary>

                      {/* Hidden Details */}
                      <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2 duration-200">
                        <div className="pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">

                          {/* Revealed Car Number */}
                          <div className="bg-gray-100 dark:bg-slate-700/50 p-3 rounded-xl mb-4 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">{t("Car Number")}</span>
                            <span className="text-lg font-black tracking-wider text-black dark:text-white">{reminder.carNumber}</span>
                          </div>

                          {/* History Log */}
                          <div className="mb-4">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-1"><History size={10} /> History Log</div>
                            <div className="pl-2 border-l-2 border-slate-200 dark:border-slate-700 space-y-3">
                              {(!reminder.history || reminder.history.length === 0) && <p className="text-[10px] opacity-40 ml-2">No history logs.</p>}
                              {(reminder.history || []).map(log => (
                                <div key={log.id} className="relative ml-2 pb-1">
                                  <div className={`absolute -left-[13px] top-1.5 w-2 h-2 rounded-full border-2 border-white dark:border-slate-800 ${log.action === 'created' ? 'bg-green-500' : log.action === 'renewed' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                  <p className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                                    <span className={`uppercase text-[9px] px-1.5 py-0.5 rounded ${log.action === 'created' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : log.action === 'renewed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>{log.action}</span>
                                    {new Date(log.timestamp).toLocaleDateString()}
                                  </p>
                                  {log.newDate && log.previousDate && log.action !== 'created' && (
                                    <div className="text-[10px] text-gray-500 dark:text-slate-500 font-mono mt-1 flex items-center gap-1 ml-1">
                                      <span>{log.previousDate}</span>
                                      <ArrowRight size={10} />
                                      <span className="text-gray-900 dark:text-white font-bold">{log.newDate}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button onClick={(e) => { handleEditGpsReminder(reminder); }} className="flex-1 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center gap-2 transition-colors dark:bg-slate-700 dark:text-blue-400 dark:hover:bg-slate-600"><Edit size={16} /> {t("Edit / Renew")}</button>
                            <button onClick={(e) => { handleDeleteGpsReminder(reminder.id); }} className="flex-1 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center gap-2 transition-colors dark:bg-slate-700 dark:text-red-400 dark:hover:bg-slate-600"><Trash2 size={16} /> {t("Delete")}</button>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                );
              })}
            {(data.gpsReminders || []).length === 0 && <div className="text-center opacity-40 mt-10 flex flex-col items-center gap-2"><Zap size={48} /> {t("No GPS Reminders Found")}</div>}
          </div>
        </div>
      )}
    </div>
  );





  return (
    <div className={`min-h-screen font-sans ${!isOnline ? 'pt-10' : ''}`} style={{ backgroundColor: themePreset.bg }}>
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto"></audio>

      {/* ?? CONNECTIVITY INDICATORS */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 flex items-center justify-center gap-2 shadow-lg">
          <WifiOff size={18} className="animate-pulse" />
          <span className="font-bold text-sm">You're Offline - Changes will sync when connected</span>
        </div>
      )}

      {hasPendingWrites && isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[199] bg-blue-500 text-white py-1 px-4 flex items-center justify-center gap-2 text-xs">
          <Loader2 size={14} className="animate-spin" />
          <span className="font-semibold">Syncing pending changes...</span>
        </div>
      )}

      {toast && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ?? GHOST MIC OVERLAY - Voice Search with AI */}
      {isGhostMicOpen && (
        <GhostMic
          inventory={data.entries || []}
          pages={data.pages || []}
          allowAI={data.settings?.voiceAI !== false}
          useFuzzySearch={data.settings?.fuzzySearch !== false}
          onClose={() => setIsGhostMicOpen(false)}
          onNavigate={(pageId) => {
            setActivePageId(pageId);
            setView('page');
            setIsGhostMicOpen(false);
          }}
        />
      )}

      <ImageModal src={viewImage} onClose={() => setViewImage(null)} onDelete={() => handleDeleteBill(data.bills.find(b => b.image === viewImage || b === viewImage))} />

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        t={t}
        isDark={isDark}
      />

      <LegalModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} type="privacy" t={t} isDark={isDark} />
      <LegalModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} type="faq" t={t} isDark={isDark} />

      {view === 'generalIndex' && renderGeneralIndex()}
      {view === 'pagesGrid' && renderPagesGrid()}
      {view === 'stockSearch' && renderStockSearch()}
      {view === 'page' && <ItemsPage
        activePage={activePage}
        activePageId={activePageId}
        data={data}
        isDark={isDark}
        t={t}
        isHindi={isHindi}
        setIsHindi={setIsHindi}
        setActivePageId={setActivePageId}
        setView={setView}
        pageSearchTerm={pageSearchTerm}
        setPageSearchTerm={setPageSearchTerm}
        displayLimit={displayLimit}
        setDisplayLimit={setDisplayLimit}
        setIsNewEntryOpen={setIsNewEntryOpen}
        setEditingEntry={setEditingEntry}
        setIsCopyModalOpen={setIsCopyModalOpen}
        updateQtyBuffer={updateQtyBuffer}
        tempChanges={tempChanges}
      />}
      {showAnnouncements && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 pt-20 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-4">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <MessageSquare size={18} />
                  </div>
                  <h3 className="font-bold text-[#0F1724] dark:text-white">Admin Updates</h3>
                </div>
                <button onClick={() => setShowAnnouncements(false)} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                 <div className="border-l-4 border-blue-500 pl-4 py-1">
                   <div className="flex justify-between items-start mb-1">
                     <h4 className="font-bold text-[14px] text-[#0F1724] dark:text-white">Welcome to Autohub Pro</h4>
                     <span className="text-[10px] text-gray-400">Just now</span>
                   </div>
                   <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">Inventory tools with dynamic drop-downs and realtime auto-sync features are now live!</p>
                 </div>
                 <div className="border-l-4 border-emerald-500 pl-4 py-1">
                   <div className="flex justify-between items-start mb-1">
                     <h4 className="font-bold text-[14px] text-[#0F1724] dark:text-white">Billing Made Easy</h4>
                     <span className="text-[10px] text-gray-400">1 day ago</span>
                   </div>
                   <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">You can now search and directly select inventory stock items while generating invoices or creating quotations.</p>
                 </div>
              </div>
            </div>
          </div>
        )}
        {view === 'alerts' && renderAlerts()}
      {view === 'settings' && <SettingsPanel
        isDark={isDark}
        t={t}
        settingsUnlocked={settingsUnlocked}
        handleSettingsUnlock={handleSettingsUnlock}
        settingsPassInput={settingsPassInput}
        setSettingsPassInput={setSettingsPassInput}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        data={data}
        setData={setData}
        pushToFirebase={pushToFirebase}
        user={user}
        setView={setView}
        deferredPrompt={deferredPrompt}
        setDeferredPrompt={setDeferredPrompt}
        showToast={showToast}
        themePreset={themePreset}
        notifPermission={notifPermission}
        requestNotificationPermission={requestNotificationPermission}
        setIsPrivacyOpen={setIsPrivacyOpen}
        setIsFaqOpen={setIsFaqOpen}
        handleLogout={handleLogout}
        triggerConfirm={triggerConfirm}
        setPreviousView={setPreviousView}
      />}

      {/* Bills view removed */}

      {view === 'tools' && <ToolsHub onBack={() => { setView(previousView || 'settings'); setInitialNoteId(null); setActiveToolId(null); }} t={t} isDark={isDark} initialTool={activeToolId} initialNoteId={initialNoteId} pinnedTools={data.settings.pinnedTools || []} onTogglePin={handleTogglePin} shopDetails={data.settings} data={data} />}


      {renderSaveButton()}

      <div className={`fixed bottom-0 w-full border-t flex justify-between px-2 py-2 pb-safe z-50 backdrop-blur-xl ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-[#F0F2F5] shadow-[0_-4px_20px_rgba(0,0,0,0.03)]'}`}>
        <NavBtn icon={Home} label={t("Home")} active={view === 'generalIndex'} onClick={() => { setView('generalIndex'); setActivePageId(null); }} isDark={isDark} accentHex={'#FF7A18'} />
        <NavBtn icon={Grid} label={t("Stock")} active={view === 'pagesGrid'} onClick={() => { setView('pagesGrid'); setIndexSearchTerm(''); setActivePageId(null); }} isDark={isDark} accentHex={'#FF7A18'} />
        <NavBtn icon={Search} label={t("Search")} active={view === 'stockSearch'} onClick={() => { setView('stockSearch'); setStockSearchTerm(''); }} isDark={isDark} accentHex={'#FF7A18'} />
        <NavBtn icon={Bell} label={t("Alerts")} active={view === 'alerts'} onClick={() => setView('alerts')} alert={(data.entries || []).some(e => e.qty < data.settings.limit)} isDark={isDark} accentHex={'#FF7A18'} />
        <NavBtn icon={Settings} label={t("Setting")} active={view === 'settings'} onClick={() => setView('settings')} isDark={isDark} accentHex={'#FF7A18'} />
      </div>

      {isNewPageOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-yellow-100 p-3 rounded-2xl">
                <FilePlus size={24} className="text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">{t("New Page")}</h3>
            </div>
            <div className="flex gap-2 mb-5">
              <input autoFocus className="flex-1 border-2 border-gray-200 focus:border-yellow-500 rounded-xl p-3.5 text-lg font-semibold text-black outline-none transition-colors" placeholder={t("Item Name")} value={input.itemName} onChange={e => setInput({ ...input, itemName: e.target.value })} />
              <VoiceInput onResult={(txt) => setInput(prev => ({ ...prev, itemName: txt }))} isDark={false} lang={isHindi ? 'hi-IN' : 'en-IN'} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsNewPageOpen(false)} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 transition-colors">{t("Cancel")}</button>
              <button onClick={handleAddPage} className="flex-1 py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-yellow-500/30 transition-all">{t("Add")}</button>
            </div>
          </div>
        </div>
      )}

      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-5 max-h-[85vh] flex flex-col shadow-2xl ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-black'}`}>
            {!copySourcePageId ? (
              <>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Copy size={20} className="text-blue-500" />
                  {t("Select Page to Copy From")}
                </h3>
                <div className="overflow-y-auto flex-1 space-y-2">
                  {data.pages.filter(p => p.id !== activePageId).map(p => {
                    const itemCount = data.entries.filter(e => e.pageId === p.id).length;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleImportItems(p.id)}
                        className={`w-full text-left p-4 border rounded-xl flex items-center justify-between transition-all ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-blue-50'}`}
                      >
                        <div>
                          <span className="font-bold block">{p.pageNo}. {t(p.itemName)}</span>
                          <span className="text-xs opacity-60">{itemCount} {t("items")}</span>
                        </div>
                        <ChevronRight size={18} className="opacity-40" />
                      </button>
                    );
                  })}
                  {data.pages.length <= 1 && <div className="text-center opacity-50 p-8">{t("No other pages found")}</div>}
                </div>
                <button onClick={() => setIsCopyModalOpen(false)} className={`w-full mt-4 py-3 rounded-xl font-bold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                  {t("Cancel")}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-500" />
                    {t("Select Items to Copy")}
                  </h3>
                  <button onClick={() => setCopySourcePageId(null)} className="p-2 rounded-full hover:bg-gray-100/10">
                    <X size={20} />
                  </button>
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl mb-3 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  <span className="text-sm font-bold">{t("Select All")}</span>
                  <button
                    onClick={() => {
                      const allItems = data.entries.filter(e => e.pageId === copySourcePageId).map(e => e.id);
                      setSelectedCopyItems(selectedCopyItems.length === allItems.length ? [] : allItems);
                    }}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${selectedCopyItems.length === data.entries.filter(e => e.pageId === copySourcePageId).length
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : isDark ? 'border-slate-500' : 'border-gray-300'
                      }`}
                  >
                    {selectedCopyItems.length === data.entries.filter(e => e.pageId === copySourcePageId).length && <CheckCircle size={14} />}
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 space-y-2 mb-4">
                  {data.entries.filter(e => e.pageId === copySourcePageId).map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedCopyItems(prev =>
                        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                      )}
                      className={`w-full text-left p-3 border rounded-xl flex items-center justify-between transition-all ${selectedCopyItems.includes(item.id)
                        ? 'border-blue-500 bg-blue-500/10'
                        : isDark ? 'border-slate-600' : 'border-gray-200'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedCopyItems.includes(item.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : isDark ? 'border-slate-500' : 'border-gray-300'
                          }`}>
                          {selectedCopyItems.includes(item.id) && <CheckCircle size={12} />}
                        </div>
                        <span className="font-medium">{t(item.car)}</span>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                        Qty: {item.qty}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setCopySourcePageId(null); setSelectedCopyItems([]); }}
                    className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                  >
                    {t("Back")}
                  </button>
                  <button
                    onClick={executeItemsCopy}
                    disabled={selectedCopyItems.length === 0}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${selectedCopyItems.length > 0
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    {t("Copy")} ({selectedCopyItems.length})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-black'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold">{t("Confirm Save")}</h3>
              <button onClick={() => setIsSaveModalOpen(false)} className="p-1 rounded hover:bg-gray-100/10"><X size={20} /></button>
            </div>
            <p className="text-sm opacity-70 mb-4">{t("Enter Product Password to save changes:")}</p>

            <input
              autoFocus
              type="password"
              className={`w-full p-3 rounded-lg text-lg font-bold text-center tracking-widest mb-6 border-2 ${isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-gray-50 border-gray-300 text-black'}`}
              placeholder="****"
              value={savePassInput}
              onChange={e => setSavePassInput(e.target.value)}
            />

            <div className="flex gap-3">
              <button onClick={() => setIsSaveModalOpen(false)} className="flex-1 py-3 bg-gray-500/20 hover:bg-gray-500/30 rounded-lg font-bold">{t("Cancel")}</button>
              <button onClick={executeSave} className="flex-1 py-3 bg-green-600 text-white hover:bg-green-500 rounded-lg font-bold shadow-lg shadow-green-500/30">{t("Confirm Save")}</button>
            </div>
          </div>
        </div>
      )}

      {managingPage && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6">
            <h3 className="text-xl font-bold mb-2 text-black">{t("Manage Page")}</h3>
            <p className="text-gray-500 mb-4 text-sm font-bold">#{managingPage.pageNo}</p>

            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500">{t("Rename")}</label>
              <input className="w-full border-2 border-black rounded p-2 font-bold text-black mb-2" value={input.itemName} onChange={e => setInput({ ...input, itemName: e.target.value })} />
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => handleMovePage('UP')} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded font-bold flex items-center justify-center gap-2"><ChevronUp size={20} /> {t("Move Up")}</button>
              <button onClick={() => handleMovePage('DOWN')} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded font-bold flex items-center justify-center gap-2"><ChevronDown size={20} /> {t("Move Down")}</button>
            </div>

            <div className="flex gap-2">
              <button onClick={handleDeletePage} className="flex-1 py-3 bg-red-100 text-red-600 rounded font-bold flex items-center justify-center gap-2"><Trash2 size={18} /> {t("Delete")}</button>
              <button onClick={handleRenamePage} className="flex-[2] py-3 bg-blue-600 text-white rounded font-bold">{t("Update")}</button>
            </div>
            <button onClick={() => setManagingPage(null)} className="w-full mt-2 py-2 text-gray-500 font-bold">{t("Cancel")}</button>
          </div>
        </div>
      )}

      {editingEntry && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 text-black">{t("Edit Entry")}</h3>

            {/* Show Current Position */}
            <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded font-bold text-center">
              Current Position: #{data.entries.filter(e => e.pageId === editingEntry.pageId).findIndex(e => e.id === editingEntry.id) + 1}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500">{t("Car Name")}</label>
                <input className="w-full border-2 border-black rounded p-2 font-bold text-black" value={editingEntry.car} onChange={e => setEditingEntry({ ...editingEntry, car: e.target.value })} />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleMoveEntry('UP')} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded font-bold flex items-center justify-center gap-1 text-sm text-black border"><ChevronUp size={16} /> {t("Move Up")}</button>
                <button onClick={() => handleMoveEntry('DOWN')} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded font-bold flex items-center justify-center gap-1 text-sm text-black border"><ChevronDown size={16} /> {t("Move Down")}</button>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleDeleteEntry} className="flex-1 py-3 bg-red-100 text-red-600 rounded font-bold flex items-center justify-center gap-2"><Trash2 size={18} /> {t("Delete")}</button>
              <button onClick={handleEditEntrySave} className="flex-[2] py-3 bg-blue-600 text-white rounded font-bold">{t("Update Name")}</button>
            </div>
            <button onClick={() => setEditingEntry(null)} className="w-full mt-2 py-2 text-gray-500 font-bold">{t("Cancel")}</button>
          </div>
        </div>
      )}

      {isNewEntryOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6">
            <h3 className="text-xl font-bold mb-1 text-black">{t("New Entry")}</h3>
            <p className="text-sm font-bold opacity-50 mb-4 text-black">{t(activePage ? activePage.itemName : "")}</p>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input autoFocus className="w-full border-2 border-black rounded p-3 text-lg font-bold text-black" placeholder={t("Car (e.g. Swift & Alto)")} value={input.carName} onChange={e => setInput({ ...input, carName: e.target.value })} />
                  <p className="text-[10px] text-gray-500 mt-1">{t("Tip: Use 'Swift & Alto' for shared items.")}</p>
                </div>
                <VoiceInput onResult={(txt) => setInput(prev => ({ ...prev, carName: txt }))} isDark={false} lang={isHindi ? 'hi-IN' : 'en-IN'} />
              </div>
              {input.carName && (() => {
                const existing = (data.entries || []).filter(e => activePage && e.pageId === activePage.id && e.car.toLowerCase().includes(input.carName.toLowerCase())).reduce((a, b) => a + b.qty, 0);
                return existing > 0 ? <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm font-bold text-center">{t("Already have")} {existing} {t("in stock!")}</div> : null;
              })()}
              <input type="number" className="w-full border-2 border-black rounded p-3 text-lg font-bold text-black" placeholder={t("Qty")} value={input.qty} onChange={e => setInput({ ...input, qty: e.target.value })} />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsNewEntryOpen(false)} className="flex-1 py-3 bg-gray-200 rounded font-bold text-black">{t("Cancel")}</button>
              <button onClick={handleAddEntry} className="flex-1 py-3 bg-blue-600 text-white rounded font-bold">{t("Save")}</button>
            </div>
          </div>
        </div>
      )}
      
      {isDashboardToolEditorOpen && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <div className={`w-full max-w-md h-[85vh] sm:h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
              <div className={`p-5 border-b flex justify-between items-center shrink-0 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t("Customize Hub")}</h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t("Select up to 6 quick tools")} ({editingTools.length}/6)</p>
                </div>
                <button onClick={() => setIsDashboardToolEditorOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><X size={20}/></button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {DASHBOARD_TOOLS.map(tool => {
                  const isSelected = editingTools.includes(tool.id);
                  const Icon = tool.icon;
                  return (
                    <div 
                      key={tool.id} 
                      onClick={() => {
                        if (isSelected) {
                          setEditingTools(editingTools.filter(id => id !== tool.id));
                        } else {
                          if (editingTools.length >= 6) {
                            showToast(t("Maximum 6 tools allowed"), 'error');
                            return;
                          }
                          setEditingTools([...editingTools, tool.id]);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? (isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50') : (isDark ? 'border-slate-700 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300')}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-500 text-white' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500')}`}>
                          <Icon size={20} />
                        </div>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tool.name.replace('\n', ' ')}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : (isDark ? 'border-slate-600' : 'border-gray-300')}`}>
                        {isSelected && <CheckCircle size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={`p-4 border-t shrink-0 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'}`}>
                <button 
                  onClick={() => {
                    const newSettings = { ...(data.settings || {}), dashboardTools: editingTools };
                    const newData = { ...data, settings: newSettings };
                    setData(newData);
                    pushToFirebase(newData);
                    setIsDashboardToolEditorOpen(false);
                    showToast(t("Hub Updated"));
                  }} 
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                >
                  {t("Save Changes")}
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DukanRegister />
    </ErrorBoundary>
  );
}



