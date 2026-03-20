'use client';

import { useState, useEffect } from 'react';
import { 
    Plus, Trash2, ChevronLeft, ChevronRight, 
    MoreHorizontal, Layout, User as UserIcon,
    ArrowLeft, ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import { socket } from '../lib/socket';

interface Card {
    id: string;
    content: string;
    columnId: string;
    order: number;
    author: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
}

interface Column {
    id: string;
    title: string;
    order: number;
    cards: Card[];
}

interface Board {
    id: string;
    title: string;
    columns: Column[];
}

export default function KanbanBoard({ workspaceId }: { workspaceId: string }) {
    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreatingBoard, setIsCreatingBoard] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');

    useEffect(() => {
        fetchBoards();
    }, [workspaceId]);

    useEffect(() => {
        if (selectedBoard) {
            socket.emit('join-kanban', selectedBoard.id);
            socket.on('kanban-updated', () => {
                fetchBoardDetails(selectedBoard.id);
            });
            return () => {
                socket.off('kanban-updated');
            };
        }
    }, [selectedBoard?.id]);

    const fetchBoards = async () => {
        try {
            const { data } = await api.get(`/kanban/workspace/${workspaceId}`);
            setBoards(data);
            if (data.length > 0 && !selectedBoard) {
                fetchBoardDetails(data[0].id);
            } else {
                setLoading(false);
            }
        } catch (err) {}
    };

    const fetchBoardDetails = async (boardId: string) => {
        try {
            const { data } = await api.get(`/kanban/board/${boardId}`);
            setSelectedBoard(data);
        } catch (err) {} finally {
            setLoading(false);
        }
    };

    const createBoard = async () => {
        if (!newBoardTitle.trim()) return;
        try {
            const { data } = await api.post(`/kanban/workspace/${workspaceId}`, { title: newBoardTitle });
            setBoards([data, ...boards]);
            setSelectedBoard(data);
            setIsCreatingBoard(false);
            setNewBoardTitle('');
            fetchBoardDetails(data.id);
        } catch (err) {}
    };

    const addCard = async (columnId: string) => {
        const content = prompt('Card content:');
        if (!content) return;
        try {
            await api.post(`/kanban/columns/${columnId}/cards`, { content });
            socket.emit('update-kanban', selectedBoard?.id);
            fetchBoardDetails(selectedBoard!.id);
        } catch (err) {}
    };

    const moveCard = async (cardId: string, targetColumnId: string) => {
        try {
            await api.put(`/kanban/cards/${cardId}`, { columnId: targetColumnId });
            socket.emit('update-kanban', selectedBoard?.id);
            fetchBoardDetails(selectedBoard!.id);
        } catch (err) {}
    };

    const deleteCard = async (cardId: string) => {
        if (!confirm('Delete this card?')) return;
        try {
            await api.delete(`/kanban/cards/${cardId}`);
            socket.emit('update-kanban', selectedBoard?.id);
            fetchBoardDetails(selectedBoard!.id);
        } catch (err) {}
    };

    const addColumn = async () => {
        const title = prompt('Column title:');
        if (!title) return;
        try {
            await api.post(`/kanban/board/${selectedBoard?.id}/columns`, { title });
            socket.emit('update-kanban', selectedBoard?.id);
            fetchBoardDetails(selectedBoard!.id);
        } catch (err) {}
    };

    if (loading) return <div className="flex-1 flex items-center justify-center font-bold uppercase tracking-widest text-slate-400">Loading Boards...</div>;

    if (boards.length === 0 && !isCreatingBoard) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="p-8 bg-slate-100 dark:bg-slate-900 rounded-[40px] shadow-sm">
                    <Layout size={64} className="text-slate-300 dark:text-slate-700" />
                </div>
                <div>
                    <h2 className="text-2xl font-black">No Kanban Boards</h2>
                    <p className="text-slate-500 font-medium mt-2">Create your first board to start managing tasks.</p>
                </div>
                <button 
                    onClick={() => setIsCreatingBoard(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                >
                    Create Board
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Kanban Header */}
            <div className="p-4 md:p-8 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shadow-sm z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <select 
                                className="text-2xl font-black bg-transparent outline-none cursor-pointer hover:text-blue-600 transition-colors"
                                value={selectedBoard?.id || ''}
                                onChange={(e) => fetchBoardDetails(e.target.value)}
                            >
                                {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                            </select>
                            <button onClick={() => setIsCreatingBoard(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
                                <Plus size={20} />
                            </button>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Task management for {selectedBoard?.title}</p>
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
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-8 scrollbar-thin">
                <div className="flex gap-6 h-full min-w-max pb-4">
                    {selectedBoard?.columns.map((column, colIndex) => (
                        <div key={column.id} className="w-80 flex flex-col h-full bg-slate-100/50 dark:bg-slate-900/30 rounded-[32px] border dark:border-slate-800/50">
                            {/* Column Header */}
                            <div className="p-6 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    <h3 className="font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest text-xs">
                                        {column.title} <span className="ml-2 text-slate-400">{column.cards.length}</span>
                                    </h3>
                                </div>
                                <button onClick={() => addCard(column.id)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all">
                                    <Plus size={18} />
                                </button>
                            </div>

                            {/* Cards Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                {column.cards.map(card => (
                                    <div key={card.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border dark:border-slate-800/50 group">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed mb-4">{card.content}</p>
                                        
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border dark:border-slate-700">
                                                    {card.author.avatarUrl ? (
                                                        <img src={card.author.avatarUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon size={12} className="text-slate-300" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.author.username || 'User'}</span>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {colIndex > 0 && (
                                                    <button 
                                                        onClick={() => moveCard(card.id, selectedBoard.columns[colIndex - 1].id)}
                                                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                                                    >
                                                        <ArrowLeft size={14} />
                                                    </button>
                                                )}
                                                {colIndex < selectedBoard.columns.length - 1 && (
                                                    <button 
                                                        onClick={() => moveCard(card.id, selectedBoard.columns[colIndex + 1].id)}
                                                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                                                    >
                                                        <ArrowRight size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => deleteCard(card.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate-300 hover:text-red-400">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {column.cards.length === 0 && (
                                    <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-800">
                                        <p className="text-xs font-black uppercase tracking-widest">No cards</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Board Modal */}
            {isCreatingBoard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl border dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black mb-2">New Kanban Board</h3>
                        <p className="text-slate-500 text-sm mb-8 font-medium">Define a title for your new workspace board.</p>
                        
                        <input 
                            autoFocus
                            type="text"
                            className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[24px] outline-none focus:border-blue-500 border-2 border-transparent transition-all font-bold mb-8 text-lg"
                            placeholder="Board title (e.g. Sprint 1)"
                            value={newBoardTitle}
                            onChange={(e) => setNewBoardTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createBoard()}
                        />
                        
                        <div className="flex gap-4">
                            <button onClick={() => setIsCreatingBoard(false)} className="flex-1 p-5 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-xs tracking-widest">Cancel</button>
                            <button onClick={createBoard} className="flex-1 bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all uppercase text-xs tracking-widest">Create Board</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
