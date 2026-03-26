'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, Clock } from 'lucide-react';
import api from '../lib/api';
import { socket } from '../lib/socket';

interface Message {
    id: string;
    content: string;
    createdAt: string;
    author: {
        id: string;
        username: string;
        email: string;
        avatarUrl?: string;
    };
}

export default function Chat({ workspaceId, user }: { workspaceId: string, user: any }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMessages();
        socket.emit('join-chat', workspaceId);

        socket.on('message-received', (message: Message) => {
            setMessages(prev => [...prev, message]);
        });

        return () => {
            socket.emit('leave-chat', workspaceId);
            socket.off('message-received');
        };
    }, [workspaceId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const { data } = await api.get(`/chat/workspace/${workspaceId}`);
            setMessages(data);
        } catch (err) {}
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            const { data } = await api.post(`/chat/workspace/${workspaceId}`, { content: input });
            socket.emit('send-message', { workspaceId, message: data });
            setMessages(prev => [...prev, data]);
            setInput('');
        } catch (err) {
            alert('Failed to send message');
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
                    Team Chat
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Real-time collaboration with your team.</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.author.id === user?.id ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-shrink-0 w-10 h-10 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-sm flex items-center justify-center">
                            {msg.author.avatarUrl ? (
                                <img src={msg.author.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="text-slate-400" size={20} />
                            )}
                        </div>
                        
                        <div className={`max-w-[70%] space-y-1 ${msg.author.id === user?.id ? 'items-end' : ''}`}>
                            <div className={`flex items-center gap-2 mb-1 ${msg.author.id === user?.id ? 'flex-row-reverse' : ''}`}>
                                <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
                                    {msg.author.username || msg.author.email.split('@')[0]}
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                                    <Clock size={10} /> {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            
                            <div className={`p-4 rounded-3xl shadow-sm text-sm font-medium ${
                                msg.author.id === user?.id 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border dark:border-slate-800 rounded-tl-none'
                            }`}>
                                {msg.content}
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
                            className="w-full p-5 pr-16 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-500 rounded-[30px] outline-none transition-all font-bold text-slate-900 dark:text-slate-100 shadow-inner"
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button 
                            type="submit"
                            className="absolute right-3 top-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
