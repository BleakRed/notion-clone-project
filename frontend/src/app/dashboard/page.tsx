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
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col bg-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Workspaces</h1>
        <button onClick={logout} className="text-gray-500 hover:text-black">Logout</button>
      </div>
      
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="New Workspace Name"
          className="flex-1 p-2 border rounded text-black"
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
        />
        <button
          onClick={createWorkspace}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Create
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
        {workspaces.map(w => (
          <div
            key={w.id}
            onClick={() => router.push(`/workspace/${w.id}`)}
            className="p-6 border rounded-lg hover:border-black cursor-pointer shadow-sm transition-all"
          >
            <h2 className="text-xl font-semibold">{w.name}</h2>
            <p className="text-xs text-gray-400 mt-2">ID: {w.id}</p>
          </div>
        ))}
        {workspaces.length === 0 && (
          <div className="p-10 border-2 border-dashed rounded-lg text-center col-span-2 text-gray-500">
            No workspaces yet. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
