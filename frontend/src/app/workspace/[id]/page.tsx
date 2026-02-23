'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../../lib/api';
import { socket } from '../../../lib/socket';

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
  const [inviteEmail, setInviteEmail] = useState('');
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const userData = Cookies.get('user');
    if (userData) setUser(JSON.parse(userData));
    
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

      return () => {
        socket.emit('leave-page', selectedPage.id);
        socket.off('page-updated');
        socket.disconnect();
      };
    }
  }, [selectedPage]);

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
        // Automatically select first page if available
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
    } catch (err) {}
  };

  const updateContent = (newContent: string) => {
    setContent(newContent);
    if (selectedPage) {
      socket.emit('update-page', { pageId: selectedPage.id, content: newContent });
      // In a real app, we'd debounce this
      api.put(`/pages/${selectedPage.id}`, { content: newContent });
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
    <div className="flex h-screen bg-white text-black">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col p-4 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold truncate text-lg">{workspace?.name || 'Workspace'}</h2>
          <button onClick={() => router.push('/dashboard')} className="text-xs text-gray-500 hover:text-black">← Home</button>
        </div>

        <button 
          onClick={createPage} 
          className="text-left p-2 hover:bg-gray-200 rounded mb-4 font-medium transition-colors"
        >
          + New Page
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {pages.map(p => (
            <div
              key={p.id}
              onClick={() => selectPage(p)}
              className={`p-2 rounded cursor-pointer truncate text-sm transition-colors ${selectedPage?.id === p.id ? 'bg-white shadow-sm font-semibold' : 'hover:bg-gray-200'}`}
            >
              {p.title || 'Untitled'}
            </div>
          ))}
          {pages.length === 0 && <p className="text-xs text-gray-400 text-center mt-4">No pages yet</p>}
        </div>

        <div className="mt-4 border-t pt-4">
          <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-2 tracking-wider">Members</h3>
          <div className="space-y-2 mb-4">
            {members.map((m: any) => (
              <div key={m.userId} className="flex justify-between items-center text-xs group">
                <span className="truncate">{m.user.name || m.user.email}</span>
                {isOwner && m.userId !== user?.id && (
                  <button 
                    onClick={() => removeMember(m.userId)} 
                    className="text-red-500 opacity-0 group-hover:opacity-100 hover:font-bold transition-all"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-1 tracking-wider">Invite User</h3>
              <input
                type="email"
                placeholder="Member email"
                className="text-xs p-2 border rounded bg-white"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <button onClick={inviteUser} className="text-xs bg-black text-white p-2 rounded hover:bg-gray-800 transition-colors">Invite</button>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedPage ? (
          <div className="p-10 flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <input
              className="text-4xl font-bold mb-8 outline-none border-none placeholder:text-gray-200 w-full"
              placeholder="Untitled"
              value={selectedPage.title}
              onChange={(e) => setSelectedPage({...selectedPage, title: e.target.value})}
              onBlur={() => api.put(`/pages/${selectedPage.id}`, { title: selectedPage.title })}
            />
            <textarea
              className="flex-1 w-full outline-none resize-none text-lg leading-relaxed bg-transparent"
              placeholder="Type something..."
              value={content}
              onChange={(e) => updateContent(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
            <p className="text-lg">Select a page to start editing</p>
            <p className="text-sm">Collaborate in real-time with your team</p>
          </div>
        )}
      </div>
    </div>
  );
}
