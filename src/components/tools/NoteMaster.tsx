import React, { useState, useRef, useEffect } from 'react';
import {
    StickyNote, Search, PenTool, Trash2, Mic, FileText, Bold, Italic, Underline,
    Highlighter, Circle as CircleIcon, Minus, Eraser, ArrowLeft
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { FloatingNoteMenu } from '../FloatingNoteMenu';

interface NoteMasterProps {
    t: (key: string) => string;
    isDark: boolean;
    initialNoteId: number | null | string;
    onBack?: () => void;
}

const NoteMaster: React.FC<NoteMasterProps> = ({ t, isDark, initialNoteId, onBack }) => {
    // State
    const [notes, setNotes] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('proNotes');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const [currentNote, setCurrentNote] = useState<{ id: any, title: string, body: string, date: string, sketch: any, category: string }>({ id: null, title: '', body: '', date: '', sketch: null, category: 'general' });
    const [notesView, setNotesView] = useState('list');
    const [noteSearch, setNoteSearch] = useState('');
    const [noteMode, setNoteMode] = useState('text');
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushType, setBrushType] = useState('pencil');
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [isRecording, setIsRecording] = useState(false);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contentEditableRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Shared Styles
    const cardClass = `h-full flex flex-col ${isDark ? 'bg-slate-900 border-none' : 'bg-gray-50 border-none'}`;
    const commonInputClass = `w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all mb-4`;

    // Persist Notes
    useEffect(() => {
        try {
            if (notes.length > 0 || (notes.length === 0 && localStorage.getItem('proNotes'))) {
                localStorage.setItem('proNotes', JSON.stringify(notes));
                window.dispatchEvent(new Event('notesUpdated'));
            }
        } catch (e) {
            console.error('Failed to save notes', e);
        }
    }, [notes]);

    // Deep Linking
    useEffect(() => {
        if (initialNoteId && notes.length > 0) {
            const numId = Number(initialNoteId);
            const targetNote = notes.find(n => n.id === numId);
            if (targetNote) {
                setCurrentNote(targetNote);
                setNotesView('editor');
                if (targetNote.sketch) setNoteMode('draw');
                else setNoteMode('text');
            }
        }
    }, [initialNoteId, notes]);

    // Drawing Logic
    useEffect(() => {
        if (noteMode === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                if (currentNote.sketch) {
                    const img = new Image();
                    img.src = currentNote.sketch;
                    img.onload = () => ctx.drawImage(img, 0, 0);
                } else {
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }
        }
    }, [noteMode, currentNote.sketch]);

    const startDrawing = (e: any) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        setStartPos({ x, y });
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
    };

    const draw = (e: any) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (brushType === 'pencil') {
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 2;
        } else if (brushType === 'highlight') {
            ctx.strokeStyle = 'yellow'; ctx.lineWidth = 15; ctx.globalAlpha = 0.3;
        } else if (brushType === 'eraser') {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 20; ctx.globalAlpha = 1;
        }
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
    };

    const stopDrawing = () => setIsDrawing(false);

    // Note Management
    const saveCurrentNote = () => {
        let bodyContent = currentNote.body;
        if (noteMode === 'text' && contentEditableRef.current) {
            bodyContent = contentEditableRef.current.innerHTML;
        }
        if (!currentNote.title && (!bodyContent || bodyContent === '<br>') && !currentNote.sketch) { setNotesView('list'); return; }

        let sketchData = currentNote.sketch;
        if (canvasRef.current && noteMode === 'draw') {
            sketchData = canvasRef.current.toDataURL();
        }
        const finalNote = { ...currentNote, body: bodyContent, date: new Date().toLocaleString(), sketch: sketchData };

        setNotes(prevNotes => {
            if (currentNote.id) {
                return prevNotes.map(n => n.id === currentNote.id ? finalNote : n);
            } else {
                return [{ ...finalNote, id: Date.now() }, ...prevNotes];
            }
        });

        setNotesView('list');
        setNoteMode('text');
    };

    const deleteNote = (id: any) => {
        if (window.confirm("Delete note?")) {
            setNotes(prevNotes => prevNotes.filter(n => n.id !== id));
            if (currentNote.id === id) setNotesView('list');
        }
    };

    const handleNewNoteAction = (type: 'text' | 'list' | 'drawing' | 'image' | 'audio') => {
        setCurrentNote({ id: null, title: '', body: '', date: '', sketch: null, category: 'general' });
        switch (type) {
            case 'text':
                setNoteMode('text');
                setNotesView('editor');
                break;
            case 'list':
                setNoteMode('text');
                setCurrentNote(prev => ({ ...prev, body: '<ul><li>Item 1</li><li>Item 2</li></ul>' }));
                setNotesView('editor');
                break;
            case 'drawing':
                setNoteMode('draw');
                setNotesView('editor');
                break;
            case 'image':
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event: any) => {
                            const imgUrl = event.target.result;
                            setCurrentNote(prev => ({
                                ...prev,
                                body: `<img src="${imgUrl}" style="max-width:100%; border-radius: 8px;" /><br/>Write something about this image...`
                            }));
                            setNotesView('editor');
                            setNoteMode('text');
                        };
                        reader.readAsDataURL(file);
                    }
                };
                input.click();
                break;
            case 'audio':
                setNoteMode('text');
                setCurrentNote(prev => ({ ...prev, title: 'Audio Note ' + new Date().toLocaleTimeString() }));
                setNotesView('editor');
                setTimeout(() => {
                    const rec = startDictation();
                    if (rec) recognitionRef.current = rec;
                }, 500);
                break;
        }
    };

    // Dictation
    const startDictation = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'hi-IN';
            recognition.continuous = true;
            recognition.interimResults = true;

            setIsRecording(true);

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setCurrentNote(prev => ({
                        ...prev,
                        body: (prev.body || '') + ' ' + finalTranscript
                    }));
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech Recognition Error", event.error);
                if (event.error !== 'no-speech') setIsRecording(false);
            };

            recognition.onend = () => setIsRecording(false);
            recognition.start();
            return recognition;
        } else {
            alert("Voice recognition not supported.");
            return null;
        }
    };

    const stopDictation = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
    };

    const execFormat = (command: string, value: any = null) => {
        document.execCommand(command, false, value);
        if (contentEditableRef.current) contentEditableRef.current.focus();
    };


    // Render
    if (notesView === 'list') {
        return (
            <div className={cardClass}>
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                            <ArrowLeft size={24} className={isDark ? 'text-white' : 'text-slate-800'} />
                        </button>
                    )}
                    <h3 className="font-bold text-xl flex items-center gap-2">
                        <StickyNote className="text-yellow-500" size={24} />
                        Note Master
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            className={`${commonInputClass} pl-10 mb-0 py-2 text-sm`}
                            placeholder="Search notes..."
                            value={noteSearch}
                        onChange={e => setNoteSearch(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-20">
                    {notes.filter(n => n.title.toLowerCase().includes(noteSearch.toLowerCase()) || n.body.toLowerCase().includes(noteSearch.toLowerCase())).map(note => (
                        <div
                            key={note.id}
                            onClick={() => { setCurrentNote(note); setNotesView('editor'); }}
                            className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all flex flex-col justify-between h-32 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-yellow-50 border-yellow-200'}`}
                        >
                            <div>
                                <h4 className="font-bold text-sm line-clamp-1 mb-1">{note.title || 'Untitled Note'}</h4>
                                <div className="text-[10px] text-gray-500 line-clamp-3 overflow-hidden text-ellipsis opacity-70" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.body || (note.sketch ? '[Sketch]' : 'No content')) }}></div>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                                <span className="text-[9px] text-gray-400">{note.date.split(',')[0]}</span>
                                {note.sketch && <PenTool size={12} className="text-purple-500" />}
                            </div>
                        </div>
                    ))}
                    {notes.length === 0 && (
                        <div className="col-span-2 text-center py-10 opacity-50">
                            <StickyNote size={48} className="mx-auto mb-2 text-yellow-300" />
                            <p>No notes yet. Create one!</p>
                        </div>
                    )}
                </div>
                </div>
                <FloatingNoteMenu onSelect={handleNewNoteAction} />
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full overflow-hidden animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-900 border-none text-white' : 'bg-white border-none text-slate-900'}`}>
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 flex-1">
                    <button onClick={() => setNotesView('list')} className="p-2 -ml-2 rounded-full hover:bg-gray-100/10 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <input
                        className="bg-transparent font-bold text-lg outline-none w-full"
                        placeholder="Note Title"
                        value={currentNote.title}
                        onChange={e => setCurrentNote({ ...currentNote, title: e.target.value })}
                    />
                </div>
                <div className="flex gap-2">
                    <button aria-label={t("Delete Note")} onClick={() => deleteNote(currentNote.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-full"><Trash2 size={18} /></button>
                    <button aria-label={t("Save Note")} onClick={saveCurrentNote} className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-md hover:shadow-lg font-bold">Save</button>
                </div>
            </div>
            {isRecording && (
                <div className="bg-red-500 text-white p-2 text-center text-xs font-bold animate-pulse flex items-center justify-center gap-2 cursor-pointer" onClick={stopDictation}>
                    <Mic size={14} /> Recording... (Tap to Stop)
                </div>
            )}

            <div className="flex border-b">
                <button onClick={() => setNoteMode('text')} className={`flex-1 p-2 text-xs font-bold flex items-center justify-center gap-1 ${noteMode === 'text' ? 'bg-white border-b-2 border-primary text-primary' : 'bg-gray-50 text-gray-500'}`}><FileText size={14} /> Text</button>
                <button onClick={() => setNoteMode('draw')} className={`flex-1 p-2 text-xs font-bold flex items-center justify-center gap-1 ${noteMode === 'draw' ? 'bg-white border-b-2 border-purple-500 text-purple-600' : 'bg-gray-50 text-gray-500'}`}><PenTool size={14} /> Sketch</button>
            </div>

            {noteMode === 'text' ? (
                <>
                    <div className="flex gap-1 p-2 bg-gray-50 border-b overflow-x-auto">
                        <button aria-label={t("Bold")} className="p-2 hover:bg-gray-200 rounded" onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }}><Bold size={16} /></button>
                        <button aria-label={t("Italic")} className="p-2 hover:bg-gray-200 rounded" onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }}><Italic size={16} /></button>
                        <button aria-label={t("Underline")} className="p-2 hover:bg-gray-200 rounded" onMouseDown={(e) => { e.preventDefault(); execFormat('underline'); }}><Underline size={16} /></button>
                        <button aria-label={t("Highlight")} className="p-2 hover:bg-gray-200 rounded bg-yellow-100" onMouseDown={(e) => { e.preventDefault(); execFormat('hiliteColor', 'yellow'); }}><Highlighter size={16} className="text-yellow-600" /></button>
                    </div>
                    <div
                        ref={contentEditableRef}
                        className="flex-1 p-4 resize-none outline-none text-base leading-relaxed bg-transparent overflow-y-auto"
                        contentEditable={true}
                        dangerouslySetInnerHTML={{ __html: currentNote.body || '' }}
                        data-placeholder="Start typing..."
                    ></div>
                </>
            ) : (
                <div className="flex-1 relative bg-white overflow-hidden touch-none">
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-full p-1 flex gap-2 z-10">
                        <button aria-label={t("Pencil")} onClick={() => setBrushType('pencil')} className={`p-2 rounded-full ${brushType === 'pencil' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}><PenTool size={16} /></button>
                        <button aria-label={t("Highlighter Tool")} onClick={() => setBrushType('highlight')} className={`p-2 rounded-full ${brushType === 'highlight' ? 'bg-yellow-300 text-yellow-900' : 'hover:bg-gray-100'}`}><Highlighter size={16} /></button>
                        <button aria-label={t("Circle Tool")} onClick={() => setBrushType('circle')} className={`p-2 rounded-full ${brushType === 'circle' ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100'}`}><CircleIcon size={16} /></button>
                        <button aria-label={t("Line Tool")} onClick={() => setBrushType('line')} className={`p-2 rounded-full ${brushType === 'line' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}><Minus size={16} /></button>
                        <button aria-label={t("Eraser")} onClick={() => setBrushType('eraser')} className={`p-2 rounded-full ${brushType === 'eraser' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}><Eraser size={16} /></button>
                    </div>
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full cursor-crosshair touch-none"
                        width={window.innerWidth > 400 ? 400 : window.innerWidth}
                        height={600}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>
            )}
        </div>
    );
};

export default NoteMaster;
