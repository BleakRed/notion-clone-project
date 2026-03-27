'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../lib/api';
import { Layout, Plus, LogOut, ChevronRight, User as UserIcon, Settings, Search, Grid, List as ListIcon, Sun, Moon } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: Array<{
    userId: string;
    user: {
      id: string;
      username: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
}

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = Cookies.get('user');
    if (userData) setUser(JSON.parse(userData));
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    fetchWorkspaces();
  }, []);

  const toggleTheme = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    localStorage.setItem('theme', newVal ? 'dark' : 'light');
    if (newVal) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const fetchWorkspaces = async () => {
    try {
      const { data } = await api.get('/workspaces');
      setWorkspaces(data);
    } catch (err) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async () => {
    if (!newWorkspaceName) return;
    try {
      const { data } = await api.post('/workspaces', { name: newWorkspaceName });
      setWorkspaces([...workspaces, data]);
      setNewWorkspaceName('');
    } catch (err) {
      console.error(err);
    }
  };

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
      {/* Header */}
      <header className="p-6 bg-white dark:bg-slate-900 border-b dark:border-slate-800 shadow-sm sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-slate-900/80">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-2 font-black text-xl tracking-tight">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/30">
              <Layout size={24} />
            </div>
            <span>Workspaces</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
                onClick={toggleTheme} 
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all border dark:border-slate-800 shadow-sm"
                title="Toggle Theme"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 border dark:border-slate-700">
               <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 overflow-hidden border dark:border-slate-600 flex items-center justify-center">
                    {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon size={16} />
                    )}
               </div>
               <span className="text-sm font-bold pr-2">{user?.username || user?.email.split('@')[0]}</span>
            </div>
            <button onClick={logout} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-red-500 transition-all">
                <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-12 space-y-12">
        {/* Welcome Section */}
        <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-2">Hello, {user?.username || user?.name || 'Guest'} 👋</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Here are your active workspaces. Start collaborating today.</p>
                </div>
                
                <div className="flex gap-3">
                    <div className="relative flex-1 md:w-80 group">
                        <input
                            type="text"
                            placeholder="Create new workspace..."
                            className="w-full p-4 pl-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all font-bold shadow-sm"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
                        />
                        <button
                            onClick={createWorkspace}
                            className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95"
                        >
                            <Plus size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </section>

        {/* Workspaces Grid */}
        <section className="space-y-6">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">All Workspaces ({workspaces.length})</h2>
                </div>
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                    <button className="p-1.5 bg-white dark:bg-slate-800 shadow-sm rounded-md text-blue-600"><Grid size={18} /></button>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><ListIcon size={18} /></button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-slate-200 dark:bg-slate-900 rounded-3xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workspaces.map(w => (
                        <div
                            key={w.id}
                            onClick={() => router.push(`/workspace/${w.id}`)}
                            className="group p-8 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[32px] hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all relative overflow-hidden active:scale-[0.98]"
                        >
                            {/* Card Decoration */}
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-full group-hover:bg-blue-500/10 transition-colors"></div>
                            
                            <div className="relative space-y-6">
                                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                    <Layout size={28} />
                                </div>
                                
                                <div>
                                    <h2 className="text-2xl font-black group-hover:text-blue-600 transition-colors truncate">{w.name}</h2>
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">
                                        {w.ownerId === user?.id ? 'Owned by you' : 'Collaborator'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t dark:border-slate-800">
                                    <div className="flex -space-x-2 items-center">
                                        {w.members?.slice(0, 3).map((m, i) => (
                                            <div 
                                                key={m.userId} 
                                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 overflow-hidden relative group/avatar"
                                                title={m.user.username || m.user.email.split('@')[0]}
                                            >
                                                {m.user.avatarUrl ? (
                                                    <img src={m.user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                                                        {m.user.username?.[0] || m.user.email[0]}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                                                    <span className="text-[6px] text-white font-bold truncate px-0.5">{(m.user.username || m.user.email.split('@')[0]).slice(0, 5)}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {w.members?.length > 3 && (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-400">
                                                +{w.members.length - 3}
                                            </div>
                                        )}
                                        {(!w.members || w.members.length === 0) && (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-slate-300">
                                                <UserIcon size={14} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-blue-600 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {workspaces.length === 0 && (
                        <div className="col-span-full py-20 bg-white dark:bg-slate-900 border-2 border-dashed dark:border-slate-800 rounded-[40px] flex flex-col items-center justify-center gap-4 text-slate-400 text-center px-6">
                            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-full">
                                <Layout size={48} className="text-slate-200 dark:text-slate-800" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-slate-500 dark:text-slate-400">No workspaces yet</h3>
                                <p className="text-sm max-w-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-600">Create your first space using the bar above to start your project.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
      </main>

      <footer className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em] opacity-50">
         Collaborate • Build • Succeed
      </footer>
    </div>
  );
}
