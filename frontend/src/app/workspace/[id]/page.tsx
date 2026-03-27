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
  Eye, Edit2, Image as ImageIcon, Menu, X, Camera, User as UserIcon, Settings, Plus, Download, MessageSquare, Layout
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
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [kanbanBoards, setKanbanBoards] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [selectedBoard, setSelectedBoard] = useState<any>(null);
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

  useEffect(() => {
    const userData = Cookies.get('user');
    if (userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setNewUsername(parsed.username || '');
        setNewAvatarUrl(parsed.avatarUrl || '');
    }

    if (!Cookies.get('token')) {
      router.push('/');
    } else {
      fetchWorkspace();
      fetchPages();
      fetchChatRooms();
      fetchKanbanBoards();
      fetchMembers();
    }

    // Appearance
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedMode);
    if (savedMode) document.documentElement.classList.add('dark');
  }, [workspaceId]);

  const fetchChatRooms = async () => {
    try {
        const { data } = await api.get(`/chat/workspace/${workspaceId}/rooms`);
        setChatRooms(data);
        if (data.length > 0 && !selectedChat) setSelectedChat(data[0]);
    } catch (err) {}
  };

  const fetchKanbanBoards = async () => {
    try {
        const { data } = await api.get(`/kanban/workspace/${workspaceId}`);
        setKanbanBoards(data);
        if (data.length > 0 && !selectedBoard) setSelectedBoard(data[0]);
    } catch (err) {}
  };

  const handleCreateChat = async () => {
      const name = prompt('Chat room name:');
      if (!name) return;
      try {
          const { data } = await api.post(`/chat/workspace/${workspaceId}/rooms`, { name });
          setChatRooms([...chatRooms, data]);
          setSelectedChat(data);
      } catch (err) {}
  };

  const handleCreateKanban = async () => {
      const title = prompt('Board title:');
      if (!title) return;
      try {
          const { data } = await api.post(`/kanban/workspace/${workspaceId}`, { title });
          setKanbanBoards([...kanbanBoards, data]);
          setSelectedBoard(data);
      } catch (err) {}
  };

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
    socket.emit('join-chat', workspaceId);

    socket.on('page-created', (page: Page) => {
        setPages(prev => [page, ...prev]);
    });

    socket.on('member-updated', (updatedUser: any) => {
        setMembers(prev => prev.map(m => m.userId === updatedUser.id ? { ...m, user: updatedUser } : m));
        if (updatedUser.id === user?.id) {
            setUser(updatedUser);
            Cookies.set('user', JSON.stringify(updatedUser));
        }
    });

    return () => {
        socket.emit('leave-chat', workspaceId);
        socket.off('page-created');
        socket.off('member-updated');
    };
  }, [workspaceId, user?.id]);

  useEffect(() => {
    if (selectedPage) {

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
  }, [selectedPage?.id]);

  const fetchWorkspace = async () => {
    try {
      const { data } = await api.get(`/workspaces`);
      const current = data.find((w: any) => w.id === workspaceId);
      setWorkspace(current);
    } catch (err) {}
  };

  const fetchPages = async () => {
    try {
      const { data } = await api.get(`/pages/workspace/${workspaceId}`);
      setPages(data);
    } catch (err) {}
  };

  const fetchMembers = async () => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(data);
    } catch (err) {}
  };

  const handleCreatePage = async () => {
    try {
      const { data } = await api.post('/pages', { 
        title: 'Untitled', 
        workspaceId 
      });
      setPages([data, ...pages]);
      handleSelectPage(data);
    } catch (err) {}
  };

  const handleSelectPage = (page: Page) => {
    setSelectedPage(page);
    setContent(page.content);
    setIsPreview(false);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const updateContent = (val: string) => {
    setContent(val);
    if (selectedPage) {
      socket.emit('update-page', { pageId: selectedPage.id, content: val });
      // Debounced auto-save
      const timeout = setTimeout(() => {
        api.put(`/pages/${selectedPage.id}`, { content: val });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  };

  const handleCaretMove = (e: any) => {
    if (!selectedPage) return;
    const { x, y } = getCaretCoordinates(e.target, e.target.selectionStart);
    socket.emit('cursor-move', {
      pageId: selectedPage.id,
      x,
      y,
      userName: user?.username || user?.email.split('@')[0]
    });
  };

  const handleToggleDarkMode = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    localStorage.setItem('darkMode', String(newVal));
    if (newVal) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleUpdateProfile = async (removeAvatar = false) => {
    try {
        const { data } = await api.put('/auth/profile', {
            username: newUsername,
            avatarUrl: removeAvatar ? null : newAvatarUrl,
            removeAvatar
        });
        setUser(data);
        setNewAvatarUrl(data.avatarUrl || '');
        Cookies.set('user', JSON.stringify(data));
        setIsProfileOpen(false);
        alert('Profile updated!');
    } catch (err: any) {
        alert(err.response?.data?.error || 'Update failed');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const { data } = await api.post('/upload', formData);
        const markdownImage = `\n![${file.name}](${data.url})\n`;
        updateContent(content + markdownImage);
    } catch (err) {
        alert('Upload failed');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const { data } = await api.post('/upload', formData);
        setNewAvatarUrl(data.url);
    } catch (err) {
        alert('Avatar upload failed');
    }
  };

  const handleInvite = async (email: string) => {
    try {
        await api.post(`/workspaces/${workspaceId}/invite`, { email });
        alert('Invite sent!');
        fetchMembers();
    } catch (err: any) {
        alert(err.response?.data?.error || 'Invite failed');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member?')) return;
    try {
        await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
        fetchMembers();
    } catch (err) {}
  };

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/');
  };

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''} bg-white dark:bg-slate-950 transition-colors duration-300`}>
      <Sidebar 
        user={user}
        workspace={workspace}
        pages={pages}
        chatRooms={chatRooms}
        kanbanBoards={kanbanBoards}
        members={members}
        selectedPage={selectedPage}
        selectedChat={selectedChat}
        selectedBoard={selectedBoard}
        activeTab={activeTab}
        isDarkMode={isDarkMode}
        isOpen={isSidebarOpen}
        onSelectPage={handleSelectPage}
        onSelectChat={setSelectedChat}
        onSelectBoard={setSelectedBoard}
        onCreatePage={handleCreatePage}
        onCreateChat={handleCreateChat}
        onCreateKanban={handleCreateKanban}
        onTabChange={setActiveTab}
        onToggleDarkMode={handleToggleDarkMode}
        onToggleProfile={() => setIsProfileOpen(true)}
        onInvite={handleInvite}
        onRemoveMember={handleRemoveMember}
        onLogout={handleLogout}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-30">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                <Menu size={24} />
            </button>
            <h1 className="font-black text-lg tracking-tight">{workspace?.name}</h1>
            <div className="w-10" />
        </div>

        {activeTab === 'pages' ? (
          selectedPage ? (
            <>
              {/* Editor Header */}
              <div className="p-4 md:px-8 md:py-6 border-b dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl z-20">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setIsPreview(false)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${!isPreview ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
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
          selectedChat ? (
            <Chat key={selectedChat.id} workspaceId={workspaceId} roomId={selectedChat.id} user={user} roomName={selectedChat.name} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-800 flex-col gap-6">
                <MessageSquare size={64} />
                <p className="text-2xl font-black">Select a chat room</p>
            </div>
          )
        ) : (
          selectedBoard ? (
            <KanbanBoard key={selectedBoard.id} workspaceId={workspaceId} boardId={selectedBoard.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-800 flex-col gap-6">
                <Layout size={64} />
                <p className="text-2xl font-black">Select a board</p>
            </div>
          )
        )}
      </div>

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl border dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black tracking-tight">Your Profile</h2>
                    <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"><X size={20}/></button>
                </div>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-32 h-32 rounded-[40px] bg-slate-100 dark:bg-slate-800 overflow-hidden mb-4 relative group border-4 border-white dark:border-slate-800 shadow-xl">
                        {newAvatarUrl ? (
                            <img src={newAvatarUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700"><UserIcon size={48} /></div>
                        )}
                        <button 
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                        >
                            <Camera className="text-white" size={24} />
                        </button>
                    </div>
                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    <div className="flex gap-4">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] cursor-pointer hover:text-blue-500" onClick={() => avatarInputRef.current?.click()}>Change Avatar</p>
                        {newAvatarUrl && <p className="text-[10px] font-black uppercase text-red-400 tracking-[0.2em] cursor-pointer hover:text-red-600" onClick={() => handleUpdateProfile(true)}>Remove Picture</p>}
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Username</label>
                        <input 
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:border-blue-500 border-2 border-transparent transition-all font-bold"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="e.g. creative_mind"
                        />
                    </div>
                    <button 
                        onClick={() => handleUpdateProfile(false)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all uppercase text-xs tracking-widest"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* File Picker for linking */}
      {isFilePickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl border dark:border-slate-800">
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="text-2xl font-black">Link workspace resource</h2>
                      <button onClick={() => setIsFilePickerOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"><X size={20}/></button>
                  </div>
                  <FileExplorer 
                    workspaceId={workspaceId} 
                    isPicker 
                    onSelect={(file) => {
                        const link = file.type.startsWith('image/') 
                            ? `\n![${file.name}](${file.url})\n`
                            : `\n[📎 ${file.name}](${file.url})\n`;
                        updateContent(content + link);
                        setIsFilePickerOpen(false);
                    }} 
                  />
              </div>
          </div>
      )}
    </div>
  );
}
