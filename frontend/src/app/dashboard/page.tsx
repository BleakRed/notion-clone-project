'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../lib/api';

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
}

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const { data } = await api.get('/workspaces');
      setWorkspaces(data);
    } catch (err) {
      router.push('/');
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
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col bg-white dark:bg-slate-900 transition-colors">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white">Your Workspaces</h1>
        <button onClick={logout} className="text-gray-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">Logout</button>
      </div>
      
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="New Workspace Name"
          className="flex-1 p-2 border dark:border-slate-700 rounded text-black dark:text-white dark:bg-slate-800 outline-none focus:border-slate-400"
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
        />
        <button
          onClick={createWorkspace}
          className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors"
        >
          Create
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
        {workspaces.map(w => (
          <div
            key={w.id}
            onClick={() => router.push(`/workspace/${w.id}`)}
            className="p-6 border dark:border-slate-800 rounded-lg hover:border-black dark:hover:border-slate-400 cursor-pointer shadow-sm transition-all bg-white dark:bg-slate-800"
          >
            <h2 className="text-xl font-semibold text-black dark:text-white">{w.name}</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">ID: {w.id}</p>
          </div>
        ))}
        {workspaces.length === 0 && (
          <div className="p-10 border-2 border-dashed dark:border-slate-800 rounded-lg text-center col-span-2 text-gray-500 dark:text-slate-500">
            No workspaces yet. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
