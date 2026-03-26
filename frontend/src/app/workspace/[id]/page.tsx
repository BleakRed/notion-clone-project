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
  Eye, Edit2, Image as ImageIcon, Menu, X, Camera, User as UserIcon, Settings, Plus, Download
} from 'lucide-react';

import Sidebar from '../../../components/Sidebar';
import FileExplorer from '../../../components/FileExplorer';
import DrawingCanvas from '../../../components/DrawingCanvas';
import Chat from '../../../components/Chat';
import KanbanBoard from '../../../components/KanbanBoard';

// Helper to get caret coordinates in a textarea
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  const style = window.getComputedStyle(element);
  
  const properties = [
    'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust',
    'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'textDecoration',
    'letterSpacing', 'wordSpacing', 'tabSize', 'MozTabSize'
  ];

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordBreak = 'break-word';

  properties.forEach(prop => {
    // @ts-ignore
    div.style[prop] = style[prop];
  });

  div.textContent = element.value.substring(0, position);
  
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);
  const rect = element.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  
  const x = spanRect.left - divRect.left;
  const y = spanRect.top - divRect.top;

  document.body.removeChild(div);
  
  return { x, y };
}

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
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cursors, setCursors] = useState<Record<string, { x: number, y: number, userName: string }>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pages');
  const [newUsername, setNewUsername] = useState('');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const downloadMarkdown = () => {
    if (!selectedPage) return;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${selectedPage.title || 'untitled'}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

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
    if (user) {
        socket.connect();
        return () => { socket.disconnect(); };
    }
  }, [user]);

  useEffect(() => {
    if (selectedPage && user && activeTab === 'pages') {
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
      };
    }
    
    if (activeTab === 'canvas' && user && workspaceId) {
        socket.emit('join-drawing', workspaceId);
        return () => {
            // No need to emit leave-drawing unless we add a leave-drawing socket event
            // But we should at least not fight with other rooms
        };
    }
  }, [selectedPage, user, activeTab, workspaceId]);

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

  const handleCaretMove = (e: React.KeyboardEvent<HTMLTextAreaElement> | React.MouseEvent<HTMLTextAreaElement>) => {
    if (selectedPage && user && activeTab === 'pages') {
      const target = e.target as HTMLTextAreaElement;
      const { x, y } = getCaretCoordinates(target, target.selectionStart);
      
      socket.emit('cursor-move', {
        pageId: selectedPage.id,
        x,
        y,
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
      setActiveTab('pages');
      setIsSidebarOpen(false); // Close sidebar on mobile after selection
    } catch (err) {}
  };

  const createPage = async () => {
    try {
      const { data } = await api.post('/pages', { title: 'Untitled', workspaceId });
      setPages([data, ...pages]);
      setSelectedPage(data);
      setContent('');
      setIsPreview(false);
      setActiveTab('pages');
      setIsSidebarOpen(false);
    } catch (err) {}
  };

  const updateContent = (newContent: string) => {
    setContent(newContent);
    if (selectedPage) {
      socket.emit('update-page', { pageId: selectedPage.id, content: newContent });
      api.put(`/pages/${selectedPage.id}`, { content: newContent });
    }
  };

  const handleResourceSelect = (file: any) => {
    if (!selectedPage) return;
    
    let markdown = '';
    if (file.type.startsWith('image/')) {
        markdown = `\n![${file.name}](${file.url})\n`;
    } else {
        markdown = ` [${file.name}](${file.url}) `;
    }
    
    updateContent(content + markdown);
    setIsFilePickerOpen(false);
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
          fetchMembers();
          alert('Profile updated!');
      } catch (err: any) {
          alert(err.response?.data?.error || 'Failed to update profile');
      }
  };

  const inviteUser = async (email: string) => {
    try {
      await api.post(`/workspaces/${workspaceId}/invite`, { email });
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

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 text-black dark:text-slate-100 font-sans transition-colors relative overflow-hidden">
      <Sidebar 
        user={user}
        workspace={workspace}
        pages={pages}
        members={members}
        selectedPage={selectedPage}
        activeTab={activeTab}
        isDarkMode={isDarkMode}
        isOpen={isSidebarOpen}
        onSelectPage={selectPage}
        onCreatePage={createPage}
        onTabChange={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }}
        onToggleDarkMode={toggleDarkMode}
        onToggleProfile={() => setIsProfileOpen(true)}
        onInvite={inviteUser}
        onRemoveMember={removeMember}
        onLogout={logout}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b dark:border-slate-800">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <Menu size={24} />
            </button>
            <h1 className="font-bold truncate max-w-[200px]">{workspace?.name || 'Workspace'}</h1>
            <div className="w-10" /> {/* Spacer */}
        </div>

        {activeTab === 'pages' ? (
          selectedPage ? (
            <>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between px-4 md:px-8 py-4 border-b dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 gap-4">
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button 
                    onClick={() => setIsPreview(false)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${!isPreview ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                  >
                    <Edit2 size={16} /> <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button 
                    onClick={() => setIsPreview(true)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${isPreview ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                  >
                    <Eye size={16} /> <span className="hidden sm:inline">Preview</span>
                  </button>
                  <button
                    onClick={downloadMarkdown}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-all"
                    title="Download as Markdown"
                  >
                    <Download size={16} /> <span className="hidden sm:inline">Download</span>
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
                  {!isPreview && (
                    <button 
                      onClick={() => setIsFilePickerOpen(true)}
                      className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 dark:text-slate-500 transition-all group"
                      title="Link Resource"
                    >
                      <Plus size={20} className="group-hover:text-blue-500" />
                    </button>
                  )}
                  <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
                  <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                      Auto-saved
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-12 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                <div className="max-w-4xl mx-auto w-full">
                  <input
                    className="text-3xl md:text-5xl font-black mb-8 md:mb-12 outline-none border-none placeholder:text-slate-200 dark:placeholder:text-slate-800 w-full text-slate-900 dark:text-slate-100 bg-transparent tracking-tight"
                    placeholder="Untitled Page"
                    value={selectedPage.title}
                    onChange={(e) => setSelectedPage({...selectedPage, title: e.target.value})}
                    onBlur={() => api.put(`/pages/${selectedPage.id}`, { title: selectedPage.title })}
                  />
                  
                  {isPreview ? (
                    <div className="prose prose-sm md:prose-lg prose-slate dark:prose-invert max-w-none prose-pre:bg-slate-900 dark:prose-pre:bg-black prose-pre:text-slate-50 prose-img:rounded-3xl prose-img:shadow-2xl">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="relative">
                      {Object.entries(cursors).map(([id, cursor]) => (
                        <div 
                          key={id} 
                          className="cursor-label pointer-events-none absolute z-50 transition-all duration-100"
                          style={{ left: cursor.x, top: cursor.y }}
                        >
                          <div className="cursor-dot shadow-sm bg-blue-500 w-[2px] h-[1.2em] rounded-none" />
                          <div className="cursor-name shadow-lg bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md absolute -top-4 left-0 whitespace-nowrap">
                            {cursor.userName}
                          </div>
                        </div>
                      ))}
                      <textarea
                        className="w-full h-[calc(100vh-280px)] outline-none resize-none text-base md:text-xl leading-relaxed bg-transparent text-slate-700 dark:text-slate-300 font-mono scrollbar-hide"
                        placeholder="Write something brilliant... (supports Markdown)"
                        value={content}
                        onChange={(e) => updateContent(e.target.value)}
                        onKeyUp={handleCaretMove}
                        onSelect={handleCaretMove}
                        onClick={handleCaretMove}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-800 flex-col gap-6">
              <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[40px] shadow-sm animate-pulse">
                <Edit2 size={64} className="text-slate-200 dark:text-slate-800" />
              </div>
              <p className="text-2xl font-black text-slate-400 dark:text-slate-700 text-center px-4">Select a page to begin</p>
            </div>
          )
        ) : activeTab === 'files' ? (
          <FileExplorer workspaceId={workspaceId} />
        ) : activeTab === 'canvas' ? (
          <DrawingCanvas workspaceId={workspaceId} />
        ) : activeTab === 'chat' ? (
          <Chat workspaceId={workspaceId} user={user} />
        ) : (
          <KanbanBoard workspaceId={workspaceId} />
        )}
      </div>

      {/* Profile Settings Modal */}
      {isProfileOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl relative border dark:border-slate-800 animate-in zoom-in-95 duration-200">
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

      {/* File Picker Modal */}
      {isFilePickerOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
              <div className="w-full max-w-5xl h-[80vh] bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl relative border dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                      <div>
                          <h2 className="text-2xl font-black">Select Resource</h2>
                          <p className="text-sm text-slate-500 font-medium">Choose a file from your workspace to link.</p>
                      </div>
                      <button onClick={() => setIsFilePickerOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                      <FileExplorer 
                        workspaceId={workspaceId} 
                        onSelect={handleResourceSelect}
                      />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
