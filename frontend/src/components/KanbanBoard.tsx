'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Layout, User as UserIcon,
    Settings, X, Check, Info, Palette
} from 'lucide-react';
import api from '../lib/api';
import { socket } from '../lib/socket';
import Cookies from 'js-cookie';

interface Card {
    id: string;
    content: string;
    description?: string;
    columnId: string;
    order: number;
    author: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    assignees: {
        id: string;
        username: string;
        avatarUrl?: string;
    }[];
}

interface Column {
    id: string;
    title: string;
    color?: string;
    order: number;
    cards: Card[];
}

interface Board {
    id: string;
    title: string;
    columns: Column[];
}

export default function KanbanBoard({ workspaceId, boardId }: { workspaceId: string, boardId: string }) {
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
    const [workspace, setWorkspace] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<any[]>([]);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [cardEditData, setCardEditData] = useState({ content: '', description: '' });
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);

    const colors = [
        '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#64748b'
    ];

    useEffect(() => {
        const userData = Cookies.get('user');
        if (userData) setUser(JSON.parse(userData));
        
        fetchMembers();
        fetchWorkspace();
        fetchBoardDetails(boardId);
    }, [workspaceId, boardId]);

    useEffect(() => {
        if (boardId) {
            socket.emit('join-kanban', boardId);
            socket.on('kanban-updated', () => {
                fetchBoardDetails(boardId);
            });
            return () => {
                socket.emit('leave-kanban', boardId);
                socket.off('kanban-updated');
            };
        }
    }, [boardId]);

    const fetchWorkspace = async () => {
        try {
            const { data } = await api.get('/workspaces');
            const current = data.find((w: any) => w.id === workspaceId);
            setWorkspace(current);
        } catch (err) {}
    };

    const isOwner = workspace?.ownerId === user?.id;

    const fetchMembers = async () => {
        try {
            const { data } = await api.get(`/workspaces/${workspaceId}/members`);
            setMembers(data.map((m: any) => m.user));
        } catch (err) {}
    };

    const fetchBoardDetails = async (id: string) => {
        try {
            setLoading(true);
            const { data } = await api.get(`/kanban/board/${id}`);
            setSelectedBoard(data);
        } catch (err) {} finally {
            setLoading(false);
        }
    };

    const addCard = async (columnId: string) => {
        const content = prompt('Card title:');
        if (!content) return;
        try {
            await api.post(`/kanban/columns/${columnId}/cards`, { content });
            socket.emit('update-kanban', boardId);
            fetchBoardDetails(boardId);
        } catch (err) {}
    };

    const updateCard = async () => {
        if (!editingCard) return;
        try {
            await api.put(`/kanban/cards/${editingCard.id}`, cardEditData);
            socket.emit('update-kanban', boardId);
            fetchBoardDetails(boardId);
            setEditingCard(null);
        } catch (err) {}
    };

    const moveCard = async (cardId: string, targetColumnId: string) => {
        try {
            await api.put(`/kanban/cards/${cardId}`, { columnId: targetColumnId });
            socket.emit('update-kanban', boardId);
            fetchBoardDetails(boardId);
        } catch (err) {}
    };

    const assignCard = async (cardId: string, userId: string) => {
        try {
            const { data } = await api.put(`/kanban/cards/${cardId}/assign`, { userId });
            socket.emit('update-kanban', boardId);
            fetchBoardDetails(boardId);
            if (editingCard?.id === cardId) {
                setEditingCard(prev => prev ? { ...prev, assignees: data.assignees } : null);
            }
        } catch (err) {}
    };

    const deleteCard = async (cardId: string) => {
        if (!confirm('Delete this card?')) return;
        try {
            await api.delete(`/kanban/cards/${cardId}`);
            socket.emit('update-kanban', boardId);
            fetchBoardDetails(boardId);
        } catch (err) {}
    };

    const addColumn = async () => {
        const title = prompt('Column title:');
        if (!title) return;
        try {
            await api.post(`/kanban/board/${boardId}/columns`, { title });
            socket.emit('update-kanban', boardId);
            fetchBoardDetails(boardId);
        } catch (err) {}
    };

    const updateColumn = async (columnId: string, data: { title?: string, color?: string }) => {
        try {
            await api.put(`/kanban/columns/${columnId}`, data);
            socket.emit('update-kanban', boardId);
            fetchBoardDetails(boardId);
            setEditingColumn(null);
        } catch (err) {}
    };

    const onDragStart = (e: React.DragEvent, cardId: string) => {
        e.dataTransfer.setData('cardId', cardId);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const onDrop = (e: React.DragEvent, targetColumnId: string) => {
        const cardId = e.dataTransfer.getData('cardId');
        moveCard(cardId, targetColumnId);
    };

    if (loading) return <div className="flex-1 flex items-center justify-center font-bold uppercase tracking-widest text-slate-400">Loading Board...</div>;

    if (!selectedBoard) return <div className="flex-1 flex items-center justify-center">Board not found</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Kanban Header */}
            <div className="p-4 md:p-8 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shadow-sm z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black">{selectedBoard.title}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Task management board.</p>
                    </div>

                    <button 
                        onClick={addColumn}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                        <Plus size={16} /> Add Column
                    </button>
                </div>
            </div>

            {/* Board Area */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-8 scrollbar-thin">
                <div className="flex gap-6 h-fit min-w-max pb-8 items-start">
                    {selectedBoard.columns.map((column) => (
                        <div 
                            key={column.id} 
                            className="w-80 flex flex-col h-fit max-h-full bg-slate-100/50 dark:bg-slate-900/30 rounded-[32px] border dark:border-slate-800/50 shadow-sm transition-all duration-300"
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, column.id)}
                        >
                            {/* Column Header */}
                            <div className="p-6 flex justify-between items-center relative">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]" style={{ backgroundColor: column.color || '#3b82f6' }} />
                                    <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-xs">
                                        {column.title} <span className="ml-2 text-slate-400">{column.cards.length}</span>
                                    </h3>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isOwner && (
                                        <button 
                                            onClick={() => setEditingColumn(editingColumn?.id === column.id ? null : column)}
                                            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"
                                        >
                                            <Palette size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => addCard(column.id)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all">
                                        <Plus size={18} />
                                    </button>
                                </div>

                                {editingColumn?.id === column.id && (
                                    <div className="absolute top-full right-6 z-50 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl border dark:border-slate-800 flex flex-wrap gap-2 w-40">
                                        {colors.map(c => (
                                            <button 
                                                key={c}
                                                onClick={() => updateColumn(column.id, { color: c })}
                                                className={`w-6 h-6 rounded-full border-2 ${column.color === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cards Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                {column.cards.map(card => (
                                    <div 
                                        key={card.id} 
                                        draggable 
                                        onDragStart={(e) => onDragStart(e, card.id)}
                                        className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border-l-4 border dark:border-slate-800/50 group cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200"
                                        style={{ borderLeftColor: column.color || '#3b82f6' }}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-snug">{card.content}</p>
                                            <button 
                                                onClick={() => {
                                                    setEditingCard(card);
                                                    setCardEditData({ content: card.content, description: card.description || '' });
                                                }}
                                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-300 group-hover:text-slate-500 transition-all"
                                            >
                                                <Settings size={14} />
                                            </button>
                                        </div>

                                        {card.description && (
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 font-medium italic">{card.description}</p>
                                        )}
                                        
                                        <div className="flex items-center justify-between mt-4">
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {card.assignees.length > 0 ? (
                                                    card.assignees.map(u => (
                                                        <div key={u.id} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 overflow-hidden bg-slate-100">
                                                            {u.avatarUrl ? (
                                                                <img src={u.avatarUrl} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-400 bg-slate-200">
                                                                    {u.username?.[0] || 'U'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300">
                                                        <UserIcon size={10} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => deleteCard(card.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate-300 hover:text-red-400">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Card Edit Modal */}
            {editingCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border dark:border-slate-800 overflow-hidden">
                        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-2xl font-black">Card Details</h3>
                            <button onClick={() => setEditingCard(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"><X size={24} /></button>
                        </div>
                        
                        <div className="p-8 flex flex-col md:flex-row gap-8">
                            <div className="flex-1 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Title</label>
                                    <input 
                                        type="text"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:border-blue-500 border-2 border-transparent transition-all font-bold text-lg"
                                        value={cardEditData.content}
                                        onChange={(e) => setCardEditData({ ...cardEditData, content: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Description</label>
                                    <textarea 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:border-blue-500 border-2 border-transparent transition-all font-medium text-sm min-h-[150px]"
                                        placeholder="Add more details about this task..."
                                        value={cardEditData.description}
                                        onChange={(e) => setCardEditData({ ...cardEditData, description: e.target.value })}
                                    />
                                </div>
                                <button onClick={updateCard} className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all uppercase text-xs tracking-widest active:scale-95">Save Changes</button>
                            </div>

                            <div className="w-full md:w-48">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 block">Assignees</label>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                    {members.map(u => {
                                        const isAssigned = editingCard.assignees.some(a => a.id === u.id);
                                        return (
                                            <button 
                                                key={u.id}
                                                onClick={() => assignCard(editingCard.id, u.id)}
                                                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all border-2 ${isAssigned ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            >
                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200">
                                                    {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : <UserIcon size={12} className="m-auto mt-1" />}
                                                </div>
                                                <span className="text-[10px] font-bold truncate">{u.username || u.email.split('@')[0]}</span>
                                                {isAssigned && <Check size={12} className="ml-auto text-blue-500" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
