
import React, { useRef, useState, useEffect } from 'react';
import { useAuth, useData } from '../App';

type DrawingMode = 'pen' | 'line' | 'ellipse';

export const WhiteboardPage: React.FC<{ navigate: any, params?: any }> = ({ navigate, params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [mode, setMode] = useState<DrawingMode>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<string[]>([]);
  
  const { user } = useAuth();
  const data = useData();

  // SVG de la cancha basado exactamente en la imagen adjunta
  const courtSvg = `
    <svg width="100%" height="100%" viewBox="0 0 100 120" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="120" fill="white"/>
      <line x1="5" y1="25" x2="95" y2="25" stroke="black" stroke-width="1.2"/>
      <rect x="15" y="25" width="70" height="85" fill="none" stroke="black" stroke-width="0.8"/>
      <line x1="15" y1="55" x2="85" y2="55" stroke="black" stroke-width="0.5" stroke-dasharray="1.5,1.5"/>
    </svg>
  `;

  useEffect(() => {
    initCanvas();
    loadState();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    const tempUrl = canvas.toDataURL();
    canvas.width = containerRef.current.clientWidth;
    canvas.height = containerRef.current.clientHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = tempUrl;
    }
  };

  const loadState = async () => {
    if (!user) return;
    const state = await data.whiteboard.get(user.id);
    if (state && canvasRef.current) {
        const img = new Image();
        img.onload = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              setHistory([canvasRef.current!.toDataURL()]);
            }
        };
        img.src = state.dataUrl;
    } else {
        // Estado inicial vacío pero con historial
        if (canvasRef.current) setHistory([canvasRef.current.toDataURL()]);
    }
  };

  const handleBack = () => {
    if (params?.returnPage) {
        navigate(params.returnPage, { matchId: params.matchId });
    } else {
        navigate('home');
    }
  };

  const saveToHistory = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    setHistory(prev => [...prev.slice(-19), dataUrl]); // Limitar a 20 pasos para memoria
    return dataUrl;
  };

  const persistToDB = async (dataUrl: string) => {
    if (!user) return;
    await data.whiteboard.save({
        id: `wb-${user.id}`,
        userId: user.id,
        dataUrl,
        updatedAt: Date.now()
    });
  };

  const undo = () => {
    if (history.length <= 1) {
        clear();
        return;
    }
    const newHistory = [...history];
    newHistory.pop(); 
    const lastState = newHistory[newHistory.length - 1];
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas && lastState) {
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setHistory(newHistory);
            persistToDB(lastState);
        };
        img.src = lastState;
    }
  };

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setStartPos(pos);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && mode === 'pen') {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    if (mode === 'pen') {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    } else {
        const lastState = history[history.length - 1];
        if (lastState) {
            const img = new Image();
            img.src = lastState;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        
        if (mode === 'line') {
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(pos.x, pos.y);
        } else if (mode === 'ellipse') {
            const radiusX = Math.abs(pos.x - startPos.x) / 2;
            const radiusY = Math.abs(pos.y - startPos.y) / 2;
            const centerX = Math.min(startPos.x, pos.x) + radiusX;
            const centerY = Math.min(startPos.y, pos.y) + radiusY;
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        }
        ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const url = saveToHistory();
    if (url) persistToDB(url);
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        const url = saveToHistory();
        if (url) persistToDB(url);
    }
  };

  return (
    <div className="h-screen flex bg-slate-950 overflow-hidden select-none">
        {/* Pizarra Blanca Central */}
        <div ref={containerRef} className="flex-1 relative bg-white overflow-hidden flex items-center justify-center">
            {/* SVG del fondo de la cancha */}
            <div 
              className="absolute inset-0 pointer-events-none p-4 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: courtSvg }}
            />
            
            <canvas 
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 z-10 touch-none cursor-crosshair"
            />
        </div>

        {/* Barra de herramientas compacta a la derecha - Sin Scroll */}
        <div className="w-20 sm:w-24 bg-slate-900 border-l border-slate-800 flex flex-col items-center py-4 gap-2.5 h-full flex-shrink-0 z-50">
            <button onClick={handleBack} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800/50 rounded-xl mb-1 active:scale-90">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            
            <div className="h-px w-10 bg-slate-800" />

            {/* Modos de dibujo */}
            <div className="flex flex-col gap-1.5">
                {[
                  { id: 'pen', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
                  { id: 'line', icon: 'M20 4L4 20' },
                  { id: 'ellipse', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18z' }
                ].map(tool => (
                    <button 
                        key={tool.id}
                        onClick={() => setMode(tool.id as DrawingMode)}
                        className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all border ${mode === tool.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tool.icon} /></svg>
                    </button>
                ))}
            </div>

            <div className="h-px w-10 bg-slate-800" />

            {/* Colores */}
            <div className="flex flex-col gap-1.5">
                {['#000000', '#ef4444', '#22c55e', '#eab308', '#2563eb'].map(c => (
                    <button 
                        key={c} 
                        onClick={() => setColor(c)}
                        className={`w-9 h-9 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-slate-800 shadow-sm'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>

            <div className="h-px w-10 bg-slate-800" />

            {/* Tamaños de trazo */}
            <div className="flex flex-col gap-1.5">
                {[3, 7, 12].map(size => (
                    <button 
                        key={size}
                        onClick={() => setBrushSize(size)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${brushSize === size ? 'bg-slate-700 text-white border border-slate-600 shadow-md' : 'bg-slate-800/40 text-slate-600 hover:text-slate-400'}`}
                    >
                        <div style={{ width: size, height: size }} className="bg-current rounded-full" />
                    </button>
                ))}
            </div>

            <div className="flex-1" />

            {/* Acciones Finales - Se incrementó pb-10 a pb-24 para subir más los botones */}
            <div className="flex flex-col gap-2 pb-24">
                <button 
                    onClick={undo} 
                    className="w-12 h-12 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all border border-slate-700 shadow-md active:scale-90"
                    title="Borrar última acción"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                </button>
                <button 
                    onClick={clear} 
                    className="w-12 h-12 bg-rose-900/30 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-500/20 shadow-md active:scale-90"
                    title="Limpiar todo"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        </div>
    </div>
  );
};
