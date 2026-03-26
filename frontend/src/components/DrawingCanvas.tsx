'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Palette, Trash2, Save, Eraser, Pen, MousePointer2, 
  RotateCcw, ChevronRight, ChevronLeft, Menu, X, 
  Download, Image as ImageIcon, History, Plus
} from 'lucide-react';
import api from '../lib/api';
import { socket } from '../lib/socket';

export default function DrawingCanvas({ workspaceId }: { workspaceId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(5);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [history, setHistory] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetchDrawings();
    initCanvas();
    
    // Join the drawing room
    const roomName = selectedDrawingId ? `drawing-saved-${selectedDrawingId}` : `drawing-${workspaceId}`;
    socket.emit('join-drawing', roomName);
    
    // Socket setup
    socket.on('stroke-received', (data: any) => {
        // Draw if it's for the current room
        if (data.roomName === roomName) {
            drawRemoteStroke(data);
        }
    });

    socket.on('drawing-cleared', () => {
        clearCanvasLocal();
    });

    socket.on('request-canvas-state', (targetId: string) => {
        const canvas = canvasRef.current;
        if (canvas) {
            socket.emit('canvas-state-sent', { targetId, state: canvas.toDataURL() });
        }
    });

    socket.on('canvas-state-received', (state: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = state;
    });

    window.addEventListener('resize', initCanvas);
    return () => {
        window.removeEventListener('resize', initCanvas);
        socket.emit('leave-drawing', roomName);
        socket.off('stroke-received');
        socket.off('drawing-cleared');
        socket.off('request-canvas-state');
        socket.off('canvas-state-received');
    };
  }, [workspaceId, selectedDrawingId]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    
    // Save current content before resize
    const tempImage = canvas.toDataURL();
    
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = 'white'; // Fill with white initially for saving visibility
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Restore content
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = tempImage;
    }
  };

  const fetchDrawings = async () => {
    try {
      const { data } = await api.get(`/drawings/workspace/${workspaceId}`);
      setDrawings(data);
    } catch (err) {}
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Save current state for undo
    setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);

    const { x, y } = getPos(e);
    lastPos.current = { x, y };
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);
    
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    
    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = lineWidth * 2;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
    }
    
    ctx.stroke();

    // Emit to others
    const roomName = selectedDrawingId ? `drawing-saved-${selectedDrawingId}` : `drawing-${workspaceId}`;
    socket.emit('draw-stroke', {
        roomName,
        x1: lastPos.current.x,
        y1: lastPos.current.y,
        x2: x,
        y2: y,
        color: tool === 'eraser' ? 'eraser' : color,
        lineWidth: tool === 'eraser' ? lineWidth * 2 : lineWidth
    });

    lastPos.current = { x, y };
  };

  const drawRemoteStroke = (data: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(data.x1, data.y1);
    ctx.lineTo(data.x2, data.y2);
    
    if (data.color === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = data.lineWidth;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.lineWidth;
    }
    
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; // Reset
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvasLocal = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const clearCanvas = () => {
    if (!confirm('Clear entire canvas?')) return;
    clearCanvasLocal();
    const roomName = selectedDrawingId ? `drawing-saved-${selectedDrawingId}` : `drawing-${workspaceId}`;
    socket.emit('clear-drawing', roomName);
  };

  const undo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = prevState;
  };

  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setSaving(true);
    const dataUrl = canvas.toDataURL('image/png');
    
    try {
      if (selectedDrawingId) {
        await api.put(`/drawings/${selectedDrawingId}`, { data: dataUrl });
      } else {
        const title = prompt('Drawing Title:', 'Drawing ' + new Date().toLocaleTimeString());
        if (!title) { setSaving(false); return; }
        const { data } = await api.post(`/drawings/workspace/${workspaceId}`, { 
          title,
          data: dataUrl 
        });
        setSelectedDrawingId(data.id);
        setDrawings([data, ...drawings]);
      }
      alert('Saved successfully!');
    } catch (err) {
      alert('Failed to save drawing');
    } finally {
      setSaving(false);
    }
  };

  const loadDrawing = (drawing: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setSelectedDrawingId(drawing.id);
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
    };
    img.src = drawing.data;
  };

  const newCanvas = () => {
    setSelectedDrawingId(null);
    clearCanvasLocal();
  };

  const downloadDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Drawing Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-4 border-b dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md gap-4 z-20">
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-2.5 rounded-xl transition-all ${isSidebarOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                title="History"
            >
                <History size={18} />
            </button>

            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block" />

            <button 
                onClick={newCanvas}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 transition-all flex items-center gap-2"
                title="New Empty Canvas"
            >
                <Plus size={18} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">New</span>
            </button>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button 
                    onClick={() => { setTool('pen'); }}
                    className={`p-2.5 rounded-lg transition-all ${tool === 'pen' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
                >
                    <Pen size={18} />
                </button>
                <button 
                    onClick={() => { setTool('eraser'); }}
                    className={`p-2.5 rounded-lg transition-all ${tool === 'eraser' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
                >
                    <Eraser size={18} />
                </button>
            </div>
            
            {tool === 'pen' && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {[
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#000000', '#ffffff'
                    ].map((c) => (
                        <button 
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 ${color === c ? 'border-blue-500 scale-110 shadow-sm' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            )}

            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={lineWidth} 
                    onChange={(e) => setLineWidth(parseInt(e.target.value))}
                    className="w-20 md:w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[10px] font-black text-slate-400 w-4">{lineWidth}</span>
            </div>

            <button 
                onClick={undo}
                disabled={history.length === 0}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 disabled:opacity-30 transition-all"
                title="Undo"
            >
                <RotateCcw size={18} />
            </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
                onClick={clearCanvas}
                className="flex-1 md:flex-none p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
                <Trash2 size={18} /> <span className="hidden sm:inline">Clear</span>
            </button>
            <button 
                onClick={downloadDrawing}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 transition-all"
                title="Download as PNG"
            >
                <Download size={18} />
            </button>
            <button 
                onClick={saveDrawing}
                disabled={saving}
                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-widest"
            >
                <Save size={18} /> {saving ? '...' : 'Save'}
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Drawings Sidebar */}
        <div className={`
            absolute lg:static inset-y-0 left-0 z-10 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r dark:border-slate-800 transition-transform duration-300
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'}
        `}>
            <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-600 tracking-[0.2em]">Saved Drawings</h3>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-slate-400"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                    {drawings.map((d: any) => (
                        <div 
                            key={d.id} 
                            onClick={() => loadDrawing(d)}
                            className={`group p-3 rounded-2xl cursor-pointer transition-all border-2 ${selectedDrawingId === d.id ? 'bg-white dark:bg-slate-800 border-blue-500 shadow-xl shadow-blue-500/10' : 'border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'}`}
                        >
                            <div className="aspect-video bg-white dark:bg-slate-950 rounded-xl mb-3 overflow-hidden border dark:border-slate-800 relative">
                                <img src={d.data} alt={d.title} className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{d.title}</p>
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(d.updatedAt).toLocaleDateString()}</p>
                                <ChevronRight size={14} className={`text-blue-500 transition-transform ${selectedDrawingId === d.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                            </div>
                        </div>
                    ))}
                    {drawings.length === 0 && (
                        <div className="text-center py-20 opacity-30">
                            <Palette size={48} className="mx-auto text-slate-400 mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">No history</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Canvas Area */}
        <div className={`flex-1 relative cursor-crosshair bg-slate-200 dark:bg-slate-800 transition-all ${isDrawing ? 'scale-[0.995]' : 'scale-100'}`}>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full shadow-inner"
            />
            
            {/* Tool indicator */}
            <div className="absolute bottom-8 right-8 pointer-events-none flex flex-col items-end gap-2">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border dark:border-slate-800 flex items-center gap-3 animate-in slide-in-from-bottom-4">
                    <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: tool === 'eraser' ? '#cbd5e1' : color }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {tool === 'eraser' ? 'Eraser' : 'Pen'} • {lineWidth}px
                    </span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

