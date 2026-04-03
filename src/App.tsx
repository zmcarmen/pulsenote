/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Mic, 
  Image as ImageIcon, 
  Video, 
  Search, 
  Bell, 
  Tag, 
  Clock, 
  MoreVertical,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Calendar,
  X,
  Send,
  Quote,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { processNoteContent, parseTimeOnly, type AIProcessedContent } from './lib/gemini';

// Types
interface Subtask {
  id: string;
  text: string;
  remindAt?: string;
  isCompleted: boolean;
}

interface Note {
  id: string;
  content: string;
  type: 'text' | 'voice' | 'image' | 'video';
  category: 'todo' | 'idea';
  meceCategory: 'Work' | 'Travel' | 'Shopping' | 'Finance' | 'Reading' | 'Learning' | 'Medical' | 'Life' | 'Social' | 'Other';
  tags: string[];
  summary?: string;
  subtasks?: Subtask[];
  aiResponse?: string;
  isCompleted: boolean;
  reminder?: {
    taskName: string;
    remindAt?: string;
    context?: string;
    isTimeMissing: boolean;
  };
  createdAt: Date;
}

const CATEGORY_LABELS: Record<string, string> = {
  'Work': '工作',
  'Travel': '旅游',
  'Shopping': '购物',
  'Finance': '理财',
  'Reading': '读书',
  'Learning': '学习',
  'Medical': '医疗',
  'Life': '生活',
  'Social': '社交',
  'Other': '其他'
};

const PHILOSOPHY_QUOTES = [
  { text: "天行健，君子以自强不息。地势坤，君子以厚德载物。", source: "《易经》" },
  { text: "知人者智，自知者明。胜人者有力，自胜者强。", source: "《道德经》" },
  { text: "凡事预则立，不预则废。", source: "《礼记·中庸》" },
  { text: "知行合一，致良知。", source: "王阳明" },
  { text: "当你停止尝试去改变他人，而开始尝试去理解他人时，你的生活才真正开始。", source: "卡尔·罗杰斯" },
  { text: "每一个清晨都是一次重生的机会。带着觉察与勇气，去创造属于你的脉动时刻。", source: "PulseNote" },
  { text: "Be a witness of your life. 每一个瞬间都值得被记录，每一分努力都值得被见证。", source: "PulseNote" },
  { text: "人生如逆旅，我亦是行人。", source: "苏轼" },
  { text: "世界是你的，也是我的，但归根结底是属于那些身体好、活得久的人的。", source: "民间智慧" }
];

const BAGUA_DAILY = [
  { name: '乾', symbol: '☰', meaning: '天，刚健，自强不息' },
  { name: '坤', symbol: '☷', meaning: '地，柔顺，厚德载物' },
  { name: '震', symbol: '☳', meaning: '雷，动，奋发向上' },
  { name: '巽', symbol: '☴', meaning: '风，入，顺应自然' },
  { name: '坎', symbol: '☵', meaning: '水，陷，磨练意志' },
  { name: '离', symbol: '☲', meaning: '火，丽，光明磊落' },
  { name: '艮', symbol: '☶', meaning: '山，止，沉稳厚重' },
  { name: '兑', symbol: '☱', meaning: '泽，悦，乐观豁达' }
];

const PRESENCE_PHRASES = [
  { 
    title: "Be a witness of your life", 
    description: "在今年的征途中，你已经走过了 {progress}%。每一个瞬间都值得被觉察，每一份努力都在塑造未来的你。" 
  },
  { 
    title: "Be here now", 
    description: "时间流逝了 {progress}%，但生命只在当下。不要在过去中沉溺，也不要在未来中迷失，此时此刻即是永恒。" 
  },
  { 
    title: "The present moment is all you ever have", 
    description: "年度进度已达 {progress}%。记住，你无法拥有时间，你只能拥有这一刻。全然地投入，便是对生命最好的尊重。" 
  },
  { 
    title: "Everything is a reflection of your mind", 
    description: "走过今年的 {progress}%，你眼中的世界是否依然清澈？境随心转，当你改变看待时间的方式，时间便不再是负担。" 
  },
  { 
    title: "Observe without judgment", 
    description: "在已逝的 {progress}% 时间里，学会做一个静默的观察者。不评判快慢，不计较得失，只是如实地记录生命的脉动。" 
  },
  { 
    title: "Awaken to the now", 
    description: "今年的时钟已走过 {progress}%。觉醒并非在远方，而是在每一次呼吸间。在忙碌的待办中，找回那个清醒的自己。" 
  },
  { 
    title: "Mindfulness is the key to freedom", 
    description: "进度条显示 {progress}%。正念让我们从时间的枷锁中解脱。不被截止日期奴役，而是带着觉知去完成每一项使命。" 
  },
  { 
    title: "Life is a series of moments", 
    description: "今年由无数个瞬间组成，目前已汇聚成 {progress}%。每一个平凡的待办，都是构成你生命画卷不可或缺的一笔。" 
  },
  { 
    title: "Your mind is the world", 
    description: "在今年的 {progress}% 旅程中，你的内心世界是否丰盈？向内看，你会发现时间的流逝不过是心念的起伏。" 
  },
  { 
    title: "Peace is every step", 
    description: "年度进度 {progress}%。每一步都是目的地。在处理这些琐碎的任务时，愿你依然能感受到内心的宁静与喜悦。" 
  }
];

export default function App() {
  const [input, setInput] = useState('');
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('pulsenote_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'reminders' | 'ideas'>('home');
  const [viewMode, setViewMode] = useState<'list' | 'category' | 'timeline'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [showCompleted, setShowCompleted] = useState(false);

  // Year Progress Calculation
  const getYearProgress = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    const progress = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
    return Math.round(progress * 100);
  };

  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyQuote = PHILOSOPHY_QUOTES[dayOfYear % PHILOSOPHY_QUOTES.length];
  const dailyBagua = BAGUA_DAILY[dayOfYear % BAGUA_DAILY.length];
  const dailyPresence = PRESENCE_PHRASES[dayOfYear % PRESENCE_PHRASES.length];
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);
  const [naturalTimeInput, setNaturalTimeInput] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [inlineTimeInputs, setInlineTimeInputs] = useState<Record<string, string>>({});
  const [isParsingTime, setIsParsingTime] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN';
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (!recognitionRef.current) {
      console.warn('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setter(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition', err);
      }
    }
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('pulsenote_data', JSON.stringify(notes));
  }, [notes]);

  const handleInlineTimeSubmit = async (noteId: string) => {
    const timeInput = inlineTimeInputs[noteId];
    if (!timeInput || isParsingTime) return;

    setIsParsingTime(true);
    try {
      const finalTime = await parseTimeOnly(timeInput);
      setNotes(notes.map(n => {
        if (n.id !== noteId) return n;
        return {
          ...n,
          reminder: { ...n.reminder!, remindAt: finalTime, isTimeMissing: false }
        };
      }));
      setInlineTimeInputs(prev => {
        const next = { ...prev };
        delete next[noteId];
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsingTime(false);
    }
  };

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    
    try {
      const aiResults = await processNoteContent(input);
      
      const newNotes: Note[] = aiResults.map(aiResult => ({
        id: Math.random().toString(36).substr(2, 9),
        content: input, // Original input as context
        type: 'text',
        category: aiResult.type,
        meceCategory: aiResult.category,
        tags: aiResult.tags,
        summary: aiResult.summary,
        aiResponse: aiResult.aiResponse,
        isCompleted: false,
        subtasks: aiResult.subtasks?.map(st => ({
          id: Math.random().toString(36).substr(2, 9),
          text: st.text,
          remindAt: st.remindAt,
          isCompleted: false
        })),
        reminder: aiResult.reminder,
        createdAt: new Date(),
      }));

      setNotes([...newNotes, ...notes]);
      setInput('');
    } catch (err) {
      console.error(err);
      setError("AI 处理失败，请检查 API Key 配置或网络连接。");
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const filteredNotes = notes.filter(note => {
    if (activeTab === 'reminders') {
      const isTodo = note.category === 'todo';
      if (!isTodo) return false;
      if (note.isCompleted !== showCompleted) return false;
      if (selectedCategory !== 'All' && note.meceCategory !== selectedCategory) return false;
      return true;
    }
    if (activeTab === 'ideas') return note.category === 'idea';
    return true;
  });

  const getGroupedNotes = () => {
    if (viewMode === 'list' || viewMode === 'category') {
      if (viewMode === 'list') return { [showCompleted ? '已完成' : '进行中']: filteredNotes };
      
      const groups: Record<string, Note[]> = {};
      filteredNotes.forEach(note => {
        const cat = CATEGORY_LABELS[note.meceCategory] || note.meceCategory;
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(note);
      });
      return groups;
    }

    if (viewMode === 'timeline') {
      const groups: Record<string, Note[]> = {
        '今天': [],
        '明天': [],
        '以后': [],
        '待定': []
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      filteredNotes.forEach(note => {
        if (!note.reminder || note.reminder.isTimeMissing || !note.reminder.remindAt) {
          groups['待定'].push(note);
          return;
        }

        const remindDate = new Date(note.reminder.remindAt);
        remindDate.setHours(0, 0, 0, 0);

        if (remindDate.getTime() === today.getTime()) {
          groups['今天'].push(note);
        } else if (remindDate.getTime() === tomorrow.getTime()) {
          groups['明天'].push(note);
        } else {
          groups['以后'].push(note);
        }
      });

      // Remove empty groups
      Object.keys(groups).forEach(key => {
        if (groups[key].length === 0) delete groups[key];
      });

      return groups;
    }

    return { '全部': filteredNotes };
  };

  const groupedNotes = getGroupedNotes();

  const handleSetTime = async () => {
    if (!selectedNoteId || (!manualTime && !naturalTimeInput)) return;

    let finalTime = manualTime;

    if (naturalTimeInput && !manualTime) {
      setIsParsingTime(true);
      try {
        const parsed = await parseTimeOnly(naturalTimeInput);
        if (parsed) finalTime = parsed;
      } catch (err) {
        console.error(err);
      } finally {
        setIsParsingTime(false);
      }
    }

    if (finalTime) {
      setNotes(notes.map(n => {
        if (n.id !== selectedNoteId) return n;
        
        if (selectedSubtaskId) {
          return {
            ...n,
            subtasks: n.subtasks?.map(st => 
              st.id === selectedSubtaskId ? { ...st, remindAt: finalTime } : st
            )
          };
        } else {
          return { 
            ...n, 
            reminder: { ...n.reminder!, remindAt: finalTime, isTimeMissing: false } 
          };
        }
      }));
      setIsTimePickerOpen(false);
      setSelectedNoteId(null);
      setSelectedSubtaskId(null);
      setManualTime('');
      setNaturalTimeInput('');
    }
  };

  const toggleNoteCompletion = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, isCompleted: !n.isCompleted } : n));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const toggleSubtaskCompletion = (noteId: string, subtaskId: string) => {
    setNotes(notes.map(n => {
      if (n.id !== noteId) return n;
      return {
        ...n,
        subtasks: n.subtasks?.map(st => st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st)
      };
    }));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Time Picker Modal */}
      <AnimatePresence>
        {isTimePickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold">设置提醒时间</h3>
                <button onClick={() => setIsTimePickerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Natural Language Input Only */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-ios-blue" />
                    <label className="text-[13px] font-bold text-slate-800 uppercase tracking-widest">语义设置时间</label>
                  </div>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={naturalTimeInput}
                      onChange={(e) => setNaturalTimeInput(e.target.value)}
                      placeholder="例如：明天下午三点、下周一早上..."
                      className="w-full h-16 pl-6 pr-14 bg-ios-gray-6 border border-ios-gray-5 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-ios-blue/10 focus:border-ios-blue/30 transition-all text-[16px] placeholder:text-ios-gray-3"
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={() => toggleListening(setNaturalTimeInput)}
                      className={cn(
                        "absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all shadow-sm",
                        isListening ? "bg-red-500 text-white animate-pulse" : "text-ios-gray-2 hover:text-ios-blue hover:bg-white"
                      )}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-ios-gray-1 px-2 leading-relaxed">
                    脉动管家将自动解析您的描述并转化为精确的提醒时间。
                  </p>
                </div>
              </div>

              <div className="p-6 bg-ios-gray-6/50 flex gap-3 border-t border-ios-gray-5">
                <button 
                  onClick={() => setIsTimePickerOpen(false)}
                  className="flex-1 h-12 text-[14px] font-bold text-ios-gray-1 hover:bg-ios-gray-5 rounded-xl transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={handleSetTime}
                  disabled={isParsingTime || !naturalTimeInput}
                  className="flex-1 h-12 bg-ios-blue text-white text-[14px] font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isParsingTime ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      解析中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      确认设置
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 ios-blur border-b border-white/10 z-50 px-8 flex items-center justify-center">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-ios-blue to-purple-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-2xl">
              <Sparkles className="w-6 h-6 text-ios-blue animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-600">
              PulseNote
            </h1>
            <div className="h-0.5 w-full bg-gradient-to-r from-ios-blue to-transparent rounded-full opacity-50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
          </div>
        </div>
      </header>

      <main className="pt-28 pb-20 px-6 max-w-4xl mx-auto">
        {/* Universal Capture Bar */}
        <section className="mb-14">
          <form 
            onSubmit={handleCapture}
            className={cn(
              "relative group transition-all duration-500 ease-out",
              isProcessing ? "scale-[0.98] opacity-80" : "scale-100"
            )}
          >
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Plus className={cn("w-5 h-5 transition-colors duration-300", input ? "text-ios-blue" : "text-ios-gray-3")} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="随时丢入想法、待办或素材..."
              className="w-full h-16 pl-14 pr-36 bg-white border border-ios-gray-5 rounded-[24px] ios-shadow focus:outline-none focus:ring-4 focus:ring-ios-blue/5 focus:border-ios-blue/30 transition-all text-lg placeholder:text-ios-gray-3"
            />
            <div className="absolute inset-y-0 right-4 flex items-center gap-1.5">
              <button 
                type="button" 
                onClick={() => toggleListening(setInput)}
                className={cn(
                  "p-2.5 rounded-xl transition-all",
                  isListening ? "bg-red-500 text-white animate-pulse" : "text-ios-gray-2 hover:text-ios-blue hover:bg-ios-blue/5"
                )}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button type="button" className="p-2.5 text-ios-gray-2 hover:text-ios-blue hover:bg-ios-blue/5 rounded-xl transition-all">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button type="button" className="p-2.5 text-ios-gray-2 hover:text-ios-blue hover:bg-ios-blue/5 rounded-xl transition-all">
                <Video className="w-5 h-5" />
              </button>
            </div>
            
            {/* AI Processing Indicator */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -bottom-10 left-0 right-0 flex items-center justify-center gap-2 text-[13px] text-ios-blue font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  脉动管家正在深度解析...
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </section>

        {/* Tabs & Filters */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex p-1 bg-ios-gray-6 rounded-2xl">
            {(['home', 'reminders', 'ideas'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2 text-[14px] font-semibold transition-all rounded-xl relative",
                  activeTab === tab ? "bg-white text-ios-blue ios-shadow" : "text-ios-gray-1 hover:text-ios-gray-2"
                )}
              >
                {tab === 'home' ? '主页' : tab === 'reminders' ? '待办提醒' : '灵感库'}
              </button>
            ))}
          </div>

          {activeTab === 'reminders' && (
            <div className="flex items-center gap-1.5 bg-ios-gray-6 p-1 rounded-2xl">
              <button 
                onClick={() => { setViewMode('list'); setSelectedCategory('All'); }}
                className={cn("p-2 rounded-xl transition-all", viewMode === 'list' && selectedCategory === 'All' ? "bg-white text-ios-blue ios-shadow" : "text-ios-gray-1 hover:bg-ios-gray-5/50")}
                title="列表视图"
              >
                <MoreVertical className="w-4 h-4 rotate-90" />
              </button>
              <button 
                onClick={() => setViewMode('category')}
                className={cn("p-2 rounded-xl transition-all", viewMode === 'category' ? "bg-white text-ios-blue ios-shadow" : "text-ios-gray-1 hover:bg-ios-gray-5/50")}
                title="按类目分组"
              >
                <Tag className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('timeline')}
                className={cn("p-2 rounded-xl transition-all", viewMode === 'timeline' ? "bg-white text-ios-blue ios-shadow" : "text-ios-gray-1 hover:bg-ios-gray-5/50")}
                title="按时间线排序"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* Home Page Content */}
        {activeTab === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            {/* Hero Section - Dynamic Quote */}
            <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-10 text-white ios-shadow min-h-[320px] flex flex-col justify-center">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-ios-blue/20 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                    <Sparkles className="w-6 h-6 text-ios-blue" />
                  </div>
                  <span className="text-[13px] font-bold uppercase tracking-[0.2em] text-ios-blue">今日启示 · {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-black leading-tight mb-10 tracking-tight max-w-2xl">
                  {dailyQuote.text.split('。').map((part, i) => (
                    part ? <span key={i} className={i === 1 ? "text-white/50 block mt-2" : "block"}>{part}。</span> : null
                  ))}
                </h2>
                
                <div className="flex items-center gap-4">
                  <div className="h-px w-12 bg-white/10" />
                  <span className="text-[14px] font-medium text-white/40 italic">—— {dailyQuote.source}</span>
                </div>
              </div>
            </div>

            {/* Time Urgency & Daily Bagua */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Year Progress */}
              <div className="md:col-span-2 p-8 rounded-[32px] bg-white border border-ios-gray-5 ios-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-ios-blue" />
                      </div>
                      <h3 className="text-[17px] font-bold text-slate-900">{dailyPresence.title}</h3>
                    </div>
                    <span className="text-[14px] font-black text-ios-blue">{getYearProgress()}%</span>
                  </div>
                  
                  <div className="relative h-3 bg-ios-gray-6 rounded-full overflow-hidden mb-4">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${getYearProgress()}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-ios-blue to-blue-400 rounded-full"
                    />
                  </div>
                  
                  <div className="flex justify-between text-[11px] font-bold text-ios-gray-3 uppercase tracking-widest">
                    <span>{new Date().getFullYear()} Start</span>
                    <span>{new Date().getFullYear()} End</span>
                  </div>
                </div>
                
                <p className="mt-8 text-[14px] text-ios-gray-2 font-medium leading-relaxed">
                  {dailyPresence.description.replace('{progress}', getYearProgress().toString())}
                </p>
              </div>

              {/* Daily Bagua */}
              <div className="p-8 rounded-[32px] bg-gradient-to-br from-slate-800 to-slate-900 text-white ios-shadow flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none flex items-center justify-center text-[200px] font-serif">
                  {dailyBagua.symbol}
                </div>
                <div className="relative z-10">
                  <div className="text-5xl mb-4 animate-pulse">{dailyBagua.symbol}</div>
                  <h4 className="text-2xl font-black mb-2">今日卦象：{dailyBagua.name}</h4>
                  <div className="h-px w-12 bg-white/20 mx-auto mb-4" />
                  <p className="text-white/60 text-[13px] font-medium leading-relaxed">
                    {dailyBagua.meaning}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action */}
            <div className="flex justify-center">
              <button 
                onClick={() => setActiveTab('reminders')}
                className="px-10 py-4 bg-ios-blue text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-all active:scale-95 ios-shadow"
              >
                开启今日脉动
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Reminders/Ideas Content */}
        {activeTab !== 'home' && (
          <motion.div 
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Tab Specific Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">
                {activeTab === 'reminders' ? '待办事项' : '灵感库'}
              </h2>
              {activeTab === 'reminders' && (
                <button 
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[12px] font-bold transition-all",
                    showCompleted ? "bg-ios-blue text-white" : "bg-ios-gray-6 text-ios-gray-1 border border-ios-gray-5"
                  )}
                >
                  {showCompleted ? '查看进行中' : '查看已完成'}
                </button>
              )}
            </div>

            {/* Category Tags Filter */}
        {activeTab === 'reminders' && viewMode === 'list' && (
          <div className="flex items-center gap-2.5 mb-8 overflow-x-auto pb-4 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('All')}
              className={cn(
                "px-5 py-2 rounded-2xl text-[13px] font-semibold whitespace-nowrap transition-all",
                selectedCategory === 'All' 
                  ? "bg-ios-blue text-white ios-shadow" 
                  : "bg-white text-ios-gray-1 border border-ios-gray-5 hover:border-ios-blue/30"
              )}
            >
              全部
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={cn(
                  "px-5 py-2 rounded-2xl text-[13px] font-semibold whitespace-nowrap transition-all",
                  selectedCategory === key 
                    ? "bg-ios-blue text-white ios-shadow" 
                    : "bg-white text-ios-gray-1 border border-ios-gray-5 hover:border-ios-blue/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-10">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[13px] mb-6 flex items-center gap-2">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <AnimatePresence initial={false}>
            {Object.keys(groupedNotes).length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24"
              >
                <div className="w-20 h-20 bg-white rounded-[32px] ios-shadow flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-ios-gray-4" />
                </div>
                <p className="text-ios-gray-1 font-medium">还没有记录任何内容，试着输入一句话吧</p>
              </motion.div>
            ) : (
              Object.entries(groupedNotes).map(([groupName, groupItems]) => (
                <div key={groupName} className="space-y-5">
                  {viewMode !== 'list' && (
                    <h3 className="text-[12px] font-bold text-ios-gray-2 uppercase tracking-[0.1em] flex items-center gap-2.5 px-2">
                      <div className="w-1.5 h-4 bg-ios-blue rounded-full" />
                      {groupName}
                      <span className="text-[11px] font-medium text-ios-gray-3 ml-1">({groupItems.length})</span>
                    </h3>
                  )}
                  <div className="space-y-5">
                    {groupItems.map((note) => (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border border-ios-gray-5 rounded-[28px] p-6 ios-shadow hover:shadow-xl transition-all duration-300 group"
                      >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {note.category === 'todo' && (
                        <button 
                          onClick={() => toggleNoteCompletion(note.id)}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                            note.isCompleted ? "bg-green-500 border-green-500" : "border-ios-gray-4 hover:border-ios-blue"
                          )}
                        >
                          {note.isCompleted && <CheckCircle2 className="w-4.5 h-4.5 text-white" />}
                        </button>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-ios-gray-2 uppercase tracking-wider">
                          {CATEGORY_LABELS[note.meceCategory] || note.meceCategory} · {note.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {note.reminder && note.reminder.remindAt && (
                          <span className="text-[10px] font-medium text-ios-blue/60 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            截止：{new Date(note.reminder.remindAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        {note.tags.map(tag => (
                          <span key={tag} className="px-2.5 py-1 bg-ios-gray-6 text-ios-gray-1 rounded-lg text-[10px] font-bold border border-ios-gray-5">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button 
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-ios-gray-3 hover:text-red-500 rounded-xl transition-all"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-ios-gray-6 rounded-xl transition-all">
                        <MoreVertical className="w-4 h-4 text-ios-gray-3" />
                      </button>
                    </div>
                  </div>

                    {note.category === 'todo' ? (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-grow">
                            <h3 className={cn(
                              "text-[18px] text-slate-900 leading-tight font-bold",
                              note.isCompleted && "line-through text-ios-gray-3"
                            )}>
                              {note.summary || note.content}
                            </h3>
                            {note.summary && note.summary !== note.content && (
                              <p className="text-[12px] text-ios-gray-3 font-medium italic border-l-2 border-ios-gray-5 pl-3 mt-1">
                                "{note.content}"
                              </p>
                            )}
                          </div>
                          
                          {/* Minimal Deadline Badge */}
                          {note.reminder && !note.reminder.isTimeMissing && (
                            <button 
                              onClick={() => {
                                setSelectedNoteId(note.id);
                                setSelectedSubtaskId(null);
                                setIsTimePickerOpen(true);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ios-gray-6 hover:bg-ios-blue/10 hover:text-ios-blue rounded-xl text-[11px] font-bold text-ios-gray-2 transition-all border border-ios-gray-5"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(note.reminder.remindAt!).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                            </button>
                          )}
                        </div>

                        {/* Inline Time Input if missing */}
                        {note.reminder?.isTimeMissing && (
                          <div className="relative">
                            <input 
                              type="text"
                              value={inlineTimeInputs[note.id] || ''}
                              onChange={(e) => setInlineTimeInputs({ ...inlineTimeInputs, [note.id]: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleInlineTimeSubmit(note.id)}
                              placeholder="设置截止时间 (如: 明天下午)"
                              className="w-full h-10 pl-4 pr-10 bg-ios-gray-6 border border-ios-gray-5 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-ios-blue/10 focus:border-ios-blue/30 transition-all"
                            />
                            <button 
                              onClick={() => handleInlineTimeSubmit(note.id)}
                              disabled={isParsingTime || !inlineTimeInputs[note.id]}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ios-gray-3 hover:text-ios-blue transition-all"
                            >
                              {isParsingTime ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                          </div>
                        )}

                        {/* Subtasks Breakdown (Compact Box) */}
                        {note.subtasks && note.subtasks.length > 0 && (
                          <div className="bg-ios-gray-6/30 border border-ios-gray-5/50 rounded-2xl p-3">
                            <div className="grid gap-1">
                              {note.subtasks.map((st) => (
                                <div key={st.id} className="flex items-center justify-between gap-3 py-1.5 px-1 group/st">
                                  <div className="flex items-center gap-3 flex-grow">
                                    <button 
                                      onClick={() => toggleSubtaskCompletion(note.id, st.id)}
                                      className={cn(
                                        "w-4.5 h-4.5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all duration-300",
                                        st.isCompleted ? "bg-green-500 border-green-500" : "border-ios-gray-4 hover:border-ios-blue"
                                      )}
                                    >
                                      {st.isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </button>
                                    <span className={cn("text-[13px] font-medium text-slate-600", st.isCompleted && "line-through text-ios-gray-3")}>
                                      {st.text}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {st.remindAt && (
                                      <span className="text-[10px] text-ios-gray-2 font-bold flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded-md border border-ios-gray-5/50">
                                        {new Date(st.remindAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                    <button 
                                      onClick={() => {
                                        setSelectedNoteId(note.id);
                                        setSelectedSubtaskId(st.id);
                                        setIsTimePickerOpen(true);
                                      }}
                                      className="opacity-0 group-hover/st:opacity-100 p-1 hover:bg-white rounded-md transition-all"
                                    >
                                      <Clock className="w-3 h-3 text-ios-gray-3 hover:text-ios-blue" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: User Thought & Structure */}
                        <div className="space-y-6">
                          <div className="relative">
                            <p className="text-[16px] text-slate-900 leading-relaxed font-medium">
                              {note.content}
                            </p>
                          </div>
                          
                          {note.subtasks && note.subtasks.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-[11px] font-bold text-ios-gray-2 uppercase tracking-widest mb-3">思维结构 (Takeaways)</p>
                              <div className="grid gap-2.5">
                                {note.subtasks.map((st) => (
                                  <div key={st.id} className="flex items-start gap-3 bg-ios-gray-6/30 p-3 rounded-2xl border border-ios-gray-5">
                                    <div className="w-2 h-2 rounded-full bg-ios-blue mt-1.5 flex-shrink-0 shadow-sm shadow-blue-500/20" />
                                    <span className="text-[14px] font-medium text-slate-700 leading-snug">
                                      {st.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column: AI Resonance */}
                        <div className="bg-slate-900 rounded-[28px] p-6 border border-slate-800 relative overflow-hidden group/ai ios-shadow">
                          <div className="absolute -top-4 -right-4 p-4 opacity-10 group-hover/ai:opacity-20 transition-opacity duration-700">
                            <Sparkles className="w-24 h-24 text-white" />
                          </div>
                          <div className="flex items-center gap-2.5 mb-5">
                            <div className="w-7 h-7 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                              <Sparkles className="w-4 h-4 text-ios-blue" />
                            </div>
                            <span className="text-[11px] font-bold text-white/90 uppercase tracking-widest">Reflection</span>
                          </div>
                          <p className="text-[15px] text-white/90 leading-relaxed font-medium">
                            {note.aiResponse || "思考是灵魂的自我对话。"}
                          </p>
                          <div className="mt-6 pt-5 border-t border-white/10">
                            <p className="text-[11px] text-white/40 italic font-medium">
                              — PulseNote · Reflection
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Summary (Common for both, but maybe less prominent for ideas now) */}
                    {/* Removed redundant AI Summary section as it's now the main title */}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
          </AnimatePresence>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</main>

      {/* Floating Action Menu (Mobile) */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
