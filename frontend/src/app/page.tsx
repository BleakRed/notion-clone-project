'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (Cookies.get('token')) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const { data } = await api.post(endpoint, { email, password });
      Cookies.set('token', data.token);
      Cookies.set('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 transition-colors">
      <div className="p-8 border dark:border-slate-800 rounded-lg shadow-sm w-96 bg-white dark:bg-slate-800">
        <h1 className="text-2xl font-bold mb-6 text-center text-black dark:text-white">Notion Clone</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              className="w-full p-2 border dark:border-slate-700 rounded text-black dark:text-white dark:bg-slate-900 outline-none focus:border-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              className="w-full p-2 border dark:border-slate-700 rounded text-black dark:text-white dark:bg-slate-900 outline-none focus:border-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-black dark:bg-white text-white dark:text-black p-2 rounded hover:bg-gray-800 dark:hover:bg-slate-200 transition-colors"
          >
            {isRegister ? 'Register' : 'Login'}
          </button>
        </form>
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-4 text-sm text-gray-600 dark:text-slate-400 hover:underline"
        >
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </div>
    </div>
  );
}
