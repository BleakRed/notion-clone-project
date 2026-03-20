'use client';

import { 
  Home, UserMinus, Plus, LogOut, Sun, Moon, User as UserIcon, 
  Settings, Send, Menu, X, FileText, HardDrive, Palette,
  MessageSquare, Layout
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface SidebarProps {
  user: any;
  workspace: any;
  pages: any[];
  members: any[];
  selectedPage: any;
  activeTab: string;
  isDarkMode: boolean;
  isOpen: boolean;
  onSelectPage: (page: any) => void;
  onCreatePage: () => void;
  onTabChange: (tab: string) => void;
  onToggleDarkMode: () => void;
  onToggleProfile: () => void;
  onInvite: (email: string) => void;
  onRemoveMember: (id: string) => void;
  onLogout: () => void;
  onClose: () => void;
}

export default function Sidebar({
  user, workspace, pages, members, selectedPage, activeTab, 
  isDarkMode, isOpen, onSelectPage, onCreatePage, onTabChange,
  onToggleDarkMode, onToggleProfile, onInvite, onRemoveMember, 
  onLogout, onClose
}: SidebarProps) {
  const router = useRouter();
  const isOwner = workspace?.ownerId === user?.id;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 border-r dark:border-slate-800 
        flex flex-col p-4 bg-slate-50 dark:bg-slate-900 shadow-inner 
        transition-transform duration-300 transform 
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex justify-between items-center mb-6 px-1">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={onToggleProfile}>
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
              onClick={onToggleDarkMode} 
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all shadow-sm"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => router.push('/dashboard')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all">
                <Home size={18} />
            </button>
            <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-1 mb-6">
            <h2 className="font-extrabold truncate text-lg text-slate-900 dark:text-slate-100 tracking-tight">{workspace?.name || 'Workspace'}</h2>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-col gap-1 mb-8">
            <button 
                onClick={() => onTabChange('pages')}
                className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'pages' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
                <FileText size={18} /> Pages
            </button>
            <button 
                onClick={() => onTabChange('files')}
                className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'files' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
                <HardDrive size={18} /> Files
            </button>
            <button 
                onClick={() => onTabChange('canvas')}
                className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'canvas' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
                <Palette size={18} /> Canvas
            </button>
            <button 
                onClick={() => onTabChange('chat')}
                className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
                <MessageSquare size={18} /> Chat
            </button>
            <button 
                onClick={() => onTabChange('kanban')}
                className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'kanban' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
                <Layout size={18} /> Kanban
            </button>
        </div>

        {activeTab === 'pages' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <button 
                onClick={onCreatePage} 
                className="flex items-center gap-3 text-left p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl mb-4 font-bold shadow-sm border border-slate-200 dark:border-slate-700 transition-all text-slate-700 dark:text-slate-200 active:scale-95"
                >
                <div className="bg-blue-600 p-1 rounded-md text-white"><Plus size={16} /></div>
                New Page
                </button>

                <div className="flex-1 overflow-y-auto space-y-1.5 px-1 scrollbar-hide">
                    {pages.map(p => (
                        <div
                        key={p.id}
                        onClick={() => onSelectPage(p)}
                        className={`p-2.5 rounded-lg cursor-pointer truncate text-sm transition-all flex items-center gap-2 ${selectedPage?.id === p.id ? 'bg-white dark:bg-slate-800 shadow-sm font-bold border border-slate-200 dark:border-slate-700 text-blue-600' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                        >
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedPage?.id === p.id ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        {p.title || 'Untitled'}
                        </div>
                    ))}
                    {pages.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-600 text-center mt-4 italic">No pages yet</p>}
                </div>
            </div>
        )}

        {/* Bottom Section */}
        <div className="mt-auto border-t dark:border-slate-800 pt-6 px-1">
          <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 mb-3 tracking-widest">Active Members</h3>
          <div className="space-y-3 mb-6 max-h-40 overflow-y-auto pr-1">
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
                    onClick={() => onRemoveMember(m.userId)} 
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
                <form onSubmit={(e) => { e.preventDefault(); onInvite(new FormData(e.currentTarget).get('email') as string); e.currentTarget.reset(); }}>
                    <div className="relative group">
                        <input
                        name="email"
                        type="email"
                        placeholder="Invite email..."
                        className="text-xs w-full p-2.5 pr-10 border dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all text-slate-800 dark:text-slate-200 shadow-sm"
                        required
                        />
                        <button type="submit" className="absolute right-2.5 top-2.5 text-slate-400 group-hover:text-blue-500 transition-colors">
                            <Send size={16} />
                        </button>
                    </div>
                </form>
            </div>
          )}
          
          <button 
            onClick={onLogout}
            className="w-full mt-6 p-2 flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </>
  );
}
