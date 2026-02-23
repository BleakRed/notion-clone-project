'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../lib/api';
import { socket } from '../../../lib/socket';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { Eye, Edit2, Image as ImageIcon, Plus, Home, UserMinus, Send, Sun, Moon } from 'lucide-react';

interface Page {
  id: string;
  title: string;
  content: string;
}

interface Cursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function Workspace() {
  const params = useParams();
  const workspaceId = params?.id as string;
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [cursors, setCursors] = useState<{ [userId: string]: Cursor }>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = Cookies.get('user');
    if (userData) setUser(JSON.parse(userData));
    
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }

    if (workspaceId) {
        fetchWorkspace();
        fetchPages();
        fetchMembers();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (selectedPage) {
      socket.connect();
      socket.emit('join-page', selectedPage.id);

      socket.on('page-updated', (newContent: string) => {
        setContent(newContent);
      });

      socket.on('cursor-updated', (data: { userId: string, userName: string, x: number, y: number }) => {
        if (data.userId !== socket.id) {
          setCursors(prev => ({
            ...prev,
            [data.userId]: {
              ...data,
              color: prev[data.userId]?.color || COLORS[Math.floor(Math.random() * COLORS.length)]
            }
          }));
        }
      });

      socket.on('user-left', (userId: string) => {
        setCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[userId];
          return newCursors;
        });
      });

      return () => {
        socket.emit('leave-page', selectedPage.id);
        socket.off('page-updated');
        socket.off('cursor-updated');
        socket.off('user-left');
        socket.disconnect();
      };
    }
  }, [selectedPage]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!selectedPage || !editorRef.current) return;
    
    const rect = editorRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socket.emit('cursor-move', {
      pageId: selectedPage.id,
      x,
      y,
      userName: user?.name || user?.email?.split('@')[0] || 'Anonymous'
    });
  }, [selectedPage, user]);

  const fetchWorkspace = async () => {
    try {
      const { data } = await api.get('/workspaces');
      const ws = data.find((w: any) => w.id === workspaceId);
      setWorkspace(ws);
    } catch (err) {}
  };

  const fetchPages = async () => {
    try {
      const { data } = await api.get(`/pages/workspace/${workspaceId}`);
      setPages(data);
      if (data.length > 0 && !selectedPage) {
        selectPage(data[0]);
      }
    } catch (err) {}
  };

  const fetchMembers = async () => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(data);
    } catch (err) {}
  };

  const selectPage = async (page: Page) => {
    try {
      const { data } = await api.get(`/pages/${page.id}`);
      setSelectedPage(data);
      setContent(data.content);
      setCursors({}); // Reset cursors when switching pages
    } catch (err) {}
  };

  const createPage = async () => {
    try {
      const { data } = await api.post('/pages', { title: 'Untitled', workspaceId });
      setPages([data, ...pages]);
      setSelectedPage(data);
      setContent('');
      setIsPreview(false);
    } catch (err) {}
  };

  const updateContent = (newContent: string) => {
    setContent(newContent);
    if (selectedPage) {
      socket.emit('update-page', { pageId: selectedPage.id, content: newContent });
      api.put(`/pages/${selectedPage.id}`, { content: newContent });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPage) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageMarkdown = `\n![${file.name}](${data.url})\n`;
      updateContent(content + imageMarkdown);
    } catch (err) {
      alert('Failed to upload image');
    }
  };

  const inviteUser = async () => {
    try {
      await api.post(`/workspaces/${workspaceId}/invite`, { email: inviteEmail });
      setInviteEmail('');
      fetchMembers();
      alert('Invited successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to invite');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const isOwner = useMemo(() => workspace?.ownerId === user?.id, [workspace, user]);

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 text-black dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Sidebar */}
      <div className="w-64 border-r dark:border-slate-800 flex flex-col p-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold truncate text-lg text-slate-800 dark:text-slate-200">{workspace?.name || 'Workspace'}</h2>
          <div className="flex gap-1">
            <button onClick={toggleTheme} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 transition-all">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button onClick={() => router.push('/dashboard')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 transition-all">
              <Home size={16} />
            </button>
          </div>
        </div>

        <button 
          onClick={createPage} 
          className="flex items-center gap-2 text-left p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded mb-4 font-medium transition-colors text-slate-700 dark:text-slate-300"
        >
          <Plus size={18} /> New Page
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {pages.map(p => (
            <div
              key={p.id}
              onClick={() => selectPage(p)}
              className={`p-2 rounded cursor-pointer truncate text-sm transition-colors ${selectedPage?.id === p.id ? 'bg-white dark:bg-slate-800 shadow-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
            >
              {p.title || 'Untitled'}
            </div>
          ))}
          {pages.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4 italic">No pages yet</p>}
        </div>

        <div className="mt-4 border-t dark:border-slate-800 pt-4">
          <h3 className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-2 tracking-wider px-2">Members</h3>
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto px-2">
            {members.map((m: any) => (
              <div key={m.userId} className="flex justify-between items-center text-xs group">
                <span className="truncate text-slate-600 dark:text-slate-400" title={m.user.email}>{m.user.name || m.user.email.split('@')[0]}</span>
                {isOwner && m.userId !== user?.id && (
                  <button 
                    onClick={() => removeMember(m.userId)} 
                    className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="flex flex-col gap-2 px-2">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Invite by email..."
                  className="text-xs w-full p-2 pr-8 border dark:border-slate-700 rounded bg-white dark:bg-slate-800 outline-none focus:border-slate-400 dark:focus:border-slate-600 text-slate-900 dark:text-slate-100"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <button onClick={inviteUser} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div 
        className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative"
        ref={editorRef}
        onMouseMove={handleMouseMove}
      >
        {selectedPage ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-8 py-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsPreview(false)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all ${!isPreview ? 'bg-slate-100 dark:bg-slate-800 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button 
                  onClick={() => setIsPreview(true)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all ${isPreview ? 'bg-slate-100 dark:bg-slate-800 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                >
                  <Eye size={16} /> Preview
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                {!isPreview && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all"
                    title="Upload Image"
                  >
                    <ImageIcon size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 relative">
              {/* Other users' cursors */}
              {Object.values(cursors).map(cursor => (
                <div 
                  key={cursor.userId}
                  className="cursor-label"
                  style={{ left: cursor.x, top: cursor.y }}
                >
                  <div className="cursor-dot" style={{ backgroundColor: cursor.color }}></div>
                  <div className="cursor-name" style={{ backgroundColor: cursor.color }}>
                    {cursor.userName}
                  </div>
                </div>
              ))}

              <div className="max-w-4xl mx-auto w-full">
                <input
                  className="text-4xl font-bold mb-8 outline-none border-none placeholder:text-slate-200 dark:placeholder:text-slate-700 w-full text-slate-800 dark:text-slate-100 bg-transparent"
                  placeholder="Untitled Page"
                  value={selectedPage.title}
                  onChange={(e) => setSelectedPage({...selectedPage, title: e.target.value})}
                  onBlur={() => api.put(`/pages/${selectedPage.id}`, { title: selectedPage.title })}
                />
                
                {isPreview ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none prose-pre:bg-slate-900 dark:prose-pre:bg-black prose-pre:text-slate-50 prose-img:rounded-xl">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    className="w-full h-[calc(100vh-250px)] outline-none resize-none text-lg leading-relaxed bg-transparent text-slate-700 dark:text-slate-300 font-mono placeholder:text-slate-200 dark:placeholder:text-slate-700"
                    placeholder="Start writing with Markdown... (e.g., # Hello World)"
                    value={content}
                    onChange={(e) => updateContent(e.target.value)}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-700 flex-col gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full">
              <Edit2 size={48} />
            </div>
            <div className="text-center">
              <p className="text-xl font-medium text-slate-400 dark:text-slate-500">Select a page to start editing</p>
              <p className="text-sm italic">Everything you write is saved in real-time</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
