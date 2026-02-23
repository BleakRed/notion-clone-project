'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../lib/api';
import { socket } from '../../../lib/socket';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { 
  Eye, Edit2, Image as ImageIcon, Plus, Home, UserMinus, Send, 
  Settings, LogOut, Sun, Moon, User as UserIcon, Camera, X 
} from 'lucide-react';

interface Page {
  id: string;
  title: string;
  content: string;
}

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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cursors, setCursors] = useState<Record<string, { x: number, y: number, userName: string }>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = Cookies.get('user');
    if (userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setNewUsername(parsed.username || '');
        setNewAvatarUrl(parsed.avatarUrl || '');
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    if (workspaceId) {
        fetchWorkspace();
        fetchPages();
        fetchMembers();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (selectedPage && user) {
      socket.connect();
      socket.emit('join-page', selectedPage.id);

      socket.on('page-updated', (newContent: string) => {
        setContent(newContent);
      });

      socket.on('cursor-updated', (data: { userId: string, userName: string, x: number, y: number }) => {
        setCursors(prev => ({
          ...prev,
          [data.userId]: { x: data.x, y: data.y, userName: data.userName }
        }));
      });

      socket.on('user-left', (userId: string) => {
        setCursors(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
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
  }, [selectedPage, user]);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (selectedPage && user) {
      socket.emit('cursor-move', {
        pageId: selectedPage.id,
        x: e.clientX,
        y: e.clientY,
        userName: user.username || user.email.split('@')[0]
      });
    }
  };

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const { data } = await api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setNewAvatarUrl(data.url);
    } catch (err) {
        alert('Failed to upload avatar');
    }
  };

  const updateProfile = async () => {
      try {
          const { data } = await api.put('/auth/profile', {
              username: newUsername,
              avatarUrl: newAvatarUrl
          });
          setUser(data);
          Cookies.set('user', JSON.stringify(data));
          setIsProfileOpen(false);
          fetchMembers(); // Refresh members list to show new profile
          alert('Profile updated!');
      } catch (err: any) {
          alert(err.response?.data?.error || 'Failed to update profile');
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

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/');
  };

  const isOwner = useMemo(() => workspace?.ownerId === user?.id, [workspace, user]);

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 text-black dark:text-slate-100 font-sans transition-colors relative overflow-hidden" onMouseMove={handleMouseMove}>
      {/* Remote Cursors */}
      {Object.entries(cursors).map(([id, cursor]) => (
        <div 
          key={id} 
          className="cursor-label"
          style={{ left: cursor.x, top: cursor.y, transition: 'all 0.1s linear' }}
        >
          <div className="cursor-dot shadow-sm" />
          <div className="cursor-name shadow-lg">{cursor.userName}</div>
        </div>
      ))}

      {/* Sidebar */}
      <div className="w-68 border-r dark:border-slate-800 flex flex-col p-4 bg-slate-50 dark:bg-slate-900 shadow-inner">
        <div className="flex justify-between items-center mb-6 px-1">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsProfileOpen(true)}>
             <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-700 overflow-hidden shadow-sm flex items-center justify-center relative">
                 {user?.avatarUrl ? (
                     <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                 ) : (
                     <UserIcon className="text-slate-400" size={20} />
                 )}
                 <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                     <Settings size={14} className="text-white" />
                 </div>
             </div>
             <div className="flex flex-col">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                    {user?.username || user?.email.split('@')[0]}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Profile Settings</span>
             </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleDarkMode} 
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all shadow-sm"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => router.push('/dashboard')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all" title="Home">
                <Home size={18} />
            </button>
          </div>
        </div>

        <div className="px-1 mb-6">
            <h2 className="font-extrabold truncate text-lg text-slate-900 dark:text-slate-100 tracking-tight">{workspace?.name || 'Workspace'}</h2>
        </div>

        <button 
          onClick={createPage} 
          className="flex items-center gap-3 text-left p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl mb-6 font-bold shadow-sm border border-slate-200 dark:border-slate-700 transition-all text-slate-700 dark:text-slate-200 active:scale-95"
        >
          <div className="bg-blue-600 p-1 rounded-md text-white"><Plus size={16} /></div>
          New Page
        </button>

        <div className="flex-1 overflow-y-auto space-y-1.5 px-1 scrollbar-hide">
          {pages.map(p => (
            <div
              key={p.id}
              onClick={() => selectPage(p)}
              className={`p-2.5 rounded-lg cursor-pointer truncate text-sm transition-all flex items-center gap-2 ${selectedPage?.id === p.id ? 'bg-white dark:bg-slate-800 shadow-sm font-bold border border-slate-200 dark:border-slate-700 text-blue-600' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${selectedPage?.id === p.id ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
              {p.title || 'Untitled'}
            </div>
          ))}
          {pages.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-600 text-center mt-4 italic">No pages yet</p>}
        </div>

        <div className="mt-6 border-t dark:border-slate-800 pt-6 px-1">
          <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 mb-3 tracking-widest">Active Members</h3>
          <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-1">
            {members.map((m: any) => (
              <div key={m.userId} className="flex justify-between items-center text-xs group">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border dark:border-slate-700">
                        {m.user.avatarUrl ? (
                            <img src={m.user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-400">
                                {m.user.username?.[0] || m.user.email[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    <span className="truncate text-slate-600 dark:text-slate-400 font-medium" title={m.user.email}>{m.user.username || m.user.email.split('@')[0]}</span>
                </div>
                {isOwner && m.userId !== user?.id && (
                  <button 
                    onClick={() => removeMember(m.userId)} 
                    className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all bg-red-50 dark:bg-red-950/20 p-1 rounded"
                    title="Remove member"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="flex flex-col gap-2">
              <div className="relative group">
                <input
                  type="email"
                  placeholder="Invite email..."
                  className="text-xs w-full p-2.5 pr-10 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-sm"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <button onClick={inviteUser} className="absolute right-2.5 top-2.5 text-slate-400 group-hover:text-blue-500 transition-colors">
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
          
          <button 
            onClick={logout}
            className="w-full mt-6 p-2 flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Profile Settings Modal */}
      {isProfileOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl relative border dark:border-slate-800 animate-in zoom-in-95 duration-200">
                  <button onClick={() => setIsProfileOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                      <X size={24} />
                  </button>
                  
                  <h2 className="text-2xl font-black mb-1">Your Profile</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Customize how others see you in the workspace.</p>
                  
                  <div className="flex flex-col items-center mb-8">
                      <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 overflow-hidden shadow-lg">
                              {newAvatarUrl ? (
                                  <img src={newAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      <UserIcon size={40} />
                                  </div>
                              )}
                          </div>
                          <div className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform">
                              <Camera size={16} />
                          </div>
                      </div>
                      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </div>

                  <div className="space-y-6">
                      <div>
                          <label className="block text-xs font-black uppercase text-slate-400 dark:text-slate-500 mb-2 ml-1 tracking-widest">Username</label>
                          <input
                            type="text"
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100 font-bold"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="Enter username"
                          />
                      </div>
                      
                      <button 
                        onClick={updateProfile}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black p-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
        {selectedPage ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-8 py-4 border-b dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                <button 
                  onClick={() => setIsPreview(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${!isPreview ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button 
                  onClick={() => setIsPreview(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isPreview ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                >
                  <Eye size={16} /> Preview
                </button>
              </div>
              
              <div className="flex items-center gap-3">
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
                    className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 dark:text-slate-500 transition-all group"
                    title="Upload Image"
                  >
                    <ImageIcon size={20} className="group-hover:text-blue-500" />
                  </button>
                )}
                <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
                <span className="text-xs font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest hidden md:inline">
                    Auto-saved
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 lg:p-12 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              <div className="max-w-4xl mx-auto w-full">
                <input
                  className="text-5xl font-black mb-12 outline-none border-none placeholder:text-slate-200 dark:placeholder:text-slate-800 w-full text-slate-900 dark:text-slate-100 bg-transparent tracking-tight"
                  placeholder="Untitled Page"
                  value={selectedPage.title}
                  onChange={(e) => setSelectedPage({...selectedPage, title: e.target.value})}
                  onBlur={() => api.put(`/pages/${selectedPage.id}`, { title: selectedPage.title })}
                />
                
                {isPreview ? (
                  <div className="prose prose-lg prose-slate dark:prose-invert max-w-none prose-pre:bg-slate-900 dark:prose-pre:bg-black prose-pre:text-slate-50 prose-img:rounded-3xl prose-img:shadow-2xl">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    className="w-full h-[calc(100vh-320px)] outline-none resize-none text-xl leading-relaxed bg-transparent text-slate-700 dark:text-slate-300 font-mono scrollbar-hide"
                    placeholder="Write something brilliant... (supports Markdown)"
                    value={content}
                    onChange={(e) => updateContent(e.target.value)}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-800 flex-col gap-6">
            <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[40px] shadow-sm animate-pulse">
              <Edit2 size={64} className="text-slate-200 dark:text-slate-800" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-black text-slate-400 dark:text-slate-700">Select a page to begin</p>
              <p className="text-sm font-bold text-slate-300 dark:text-slate-800 uppercase tracking-widest">Collaborate in real-time</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
