'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Clock, Edit2, Trash2, X, Check } from 'lucide-react';
import api from '../lib/api';
import { socket } from '../lib/socket';
import Avatar from './Avatar';

interface Message {
    id: string;
    content: string;
    createdAt: string;
    updatedAt?: string;
    author: {
        id: string;
        username: string;
        email: string;
        avatarUrl?: string;
    };
}

export default function Chat({ workspaceId, roomId, user, roomName }: { workspaceId: string, roomId: string, user: any, roomName: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editInput, setEditInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const CHAR_LIMIT = 1000;

    useEffect(() => {
        fetchMessages();
        socket.emit('join-chat', roomId);

        socket.on('message-received', (message: Message) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('message-edited', (updatedMessage: Message) => {
            setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
        });

        socket.on('message-deleted', (messageId: string) => {
            setMessages(prev => prev.filter(m => m.id !== messageId));
        });

        return () => {
            socket.emit('leave-chat', roomId);
            socket.off('message-received');
            socket.off('message-edited');
            socket.off('message-deleted');
        };
    }, [roomId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const { data } = await api.get(`/chat/room/${roomId}/messages`);
            setMessages(data);
        } catch (err) {}
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || input.length > CHAR_LIMIT) return;

        try {
            await api.post(`/chat/room/${roomId}`, { content: input });
            setInput('');
        } catch (err) {
            alert('Failed to send message');
        }
    };

    const handleEdit = async (messageId: string) => {
        if (!editInput.trim() || editInput.length > CHAR_LIMIT) return;
        try {
            await api.put(`/chat/message/${messageId}`, { content: editInput });
            setEditingId(null);
        } catch (err) {
            alert('Failed to edit message');
        }
    };

    const handleDelete = async (messageId: string) => {
        if (!confirm('Delete this message?')) return;
        try {
            await api.delete(`/chat/message/${messageId}`);
        } catch (err) {
            alert('Failed to delete message');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Chat Header */}
            <div className="p-6 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shadow-sm z-10">
                <h2 className="text-2xl font-black flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                        <Send size={20} />
                    </div>
                    {roomName}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Real-time collaboration room.</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 group ${msg.author.id === user?.id ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-shrink-0 w-10 h-10 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                            <Avatar 
                                src={msg.author.avatarUrl} 
                                size={20} 
                                className="w-full h-full" 
                                fallbackText={msg.author.username || msg.author.email}
                            />
                        </div>
                        
                        <div className={`max-w-[80%] md:max-w-[70%] flex flex-col ${msg.author.id === user?.id ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-center gap-2 mb-1 ${msg.author.id === user?.id ? 'flex-row-reverse' : ''}`}>
                                <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                                    {msg.author.username || msg.author.email.split('@')[0]}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                                    <Clock size={10} /> {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {msg.updatedAt && new Date(msg.updatedAt).getTime() - new Date(msg.createdAt).getTime() > 1000 && <span className="ml-1">(edited)</span>}
                                </span>
                            </div>
                            
                            <div className="relative group/content">
                                {editingId === msg.id ? (
                                    <div className="flex flex-col gap-2">
                                        <textarea 
                                            className="p-4 rounded-3xl bg-white dark:bg-slate-800 border-2 border-blue-500 outline-none text-sm font-medium min-w-[200px] md:min-w-[300px]"
                                            value={editInput}
                                            onChange={(e) => setEditInput(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"><X size={14}/></button>
                                            <button onClick={() => handleEdit(msg.id)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"><Check size={14}/></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`p-4 rounded-3xl shadow-sm text-sm font-medium w-fit break-words ${
                                            msg.author.id === user?.id 
                                            ? 'bg-blue-600 text-white rounded-tr-none' 
                                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border dark:border-slate-800 rounded-tl-none'
                                        }`}>
                                            {msg.content}
                                        </div>
                                        {msg.author.id === user?.id && (
                                            <div className={`absolute top-0 flex gap-1 opacity-0 group-hover/content:opacity-100 transition-all duration-200 ${msg.author.id === user?.id ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                                <button 
                                                    onClick={() => { setEditingId(msg.id); setEditInput(msg.content); }}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(msg.id)}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-8 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
                <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
                    <div className="relative group">
                        <input 
                            type="text" 
                            className={`w-full p-5 pr-24 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-500 rounded-[30px] outline-none transition-all font-bold text-slate-900 dark:text-slate-100 shadow-inner ${input.length > CHAR_LIMIT ? 'border-red-500' : ''}`}
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <div className="absolute right-16 top-5 text-[10px] font-black text-slate-400 tracking-widest hidden group-focus-within:block">
                            {input.length}/{CHAR_LIMIT}
                        </div>
                        <button 
                            type="submit"
                            disabled={input.length > CHAR_LIMIT || !input.trim()}
                            className="absolute right-3 top-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:bg-slate-400"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
