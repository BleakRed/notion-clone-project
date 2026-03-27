'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../lib/api';
import { Eye, EyeOff, Layout, Share2, Zap, Shield, ChevronRight, ArrowLeft, Sun, Moon } from 'lucide-react';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    if (Cookies.get('token')) {
      router.push('/dashboard');
    }
  }, [router]);

  const toggleTheme = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    localStorage.setItem('theme', newVal ? 'dark' : 'light');
    if (newVal) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isForgot) {
        await api.post('/auth/forgot-password', { email });
        setMessage('Reset link sent to your email!');
        return;
      }

      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister
        ? { email, password, confirmPassword, username }
        : { email, password };

      const { data } = await api.post(endpoint, payload);
      Cookies.set('token', data.token);
      Cookies.set('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors overflow-y-auto">
      {/* Navbar */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full z-10">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="bg-black dark:bg-white p-1.5 rounded-lg text-white dark:text-black">
            <Layout size={24} />
          </div>
          <span>NotionClone</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all shadow-sm"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {!isForgot && (
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm font-medium hover:text-slate-500 transition-colors"
            >
              {isRegister ? 'Already have an account? Login' : "Don't have an account? Sign up"}
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-24 gap-12 max-w-7xl mx-auto w-full relative">
        {/* Hero Section */}
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
            Write, plan, <span className="text-blue-600">collaborate.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 max-w-xl mx-auto lg:mx-0">
            A real-time workspace for your team to share notes, code, and ideas.
            Everything you need in one place.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto lg:mx-0">
            {[
              { icon: <Zap size={20} className="text-yellow-500" />, title: 'Real-time sync', desc: 'No more refresh' },
              { icon: <Share2 size={20} className="text-blue-500" />, title: 'Easy sharing', desc: 'Invite with email' },
              { icon: <Shield size={20} className="text-green-500" />, title: 'Secure', desc: 'Private workspaces' },
              { icon: <Layout size={20} className="text-purple-500" />, title: 'Markdown', desc: 'Rich formatting' },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-slate-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Section */}
        <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-visible">
          {/* Background decoration */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>

          <h2 className="text-3xl font-bold mb-2">
            {isForgot ? 'Reset Password' : (isRegister ? 'Create account' : 'Welcome back')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
            {isForgot
              ? 'Enter your email to receive a reset link.'
              : (isRegister ? 'Start your collaborative journey today.' : 'Enter your credentials to access your workspace.')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isForgot ? (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1 tracking-wider">Email</label>
                <input
                  type="email"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-black dark:text-white outline-none focus:border-blue-500 transition-all"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            ) : (
              <>
                {isRegister && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1 tracking-wider">Username</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-black dark:text-white outline-none focus:border-blue-500 transition-all"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1 tracking-wider">Email</label>
                  <input
                    type="email"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-black dark:text-white outline-none focus:border-blue-500 transition-all"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1 tracking-wider">Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-black dark:text-white outline-none focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1 tracking-wider">Confirm Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-black dark:text-white outline-none focus:border-blue-500 transition-all"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                {!isRegister && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-xs text-blue-500 hover:underline font-bold"
                    >
                      Forgot Password?(doesn't work)
                    </button>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-500 text-xs p-3 rounded-xl border border-red-200 dark:border-red-800 animate-shake">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-500 text-xs p-3 rounded-xl border border-green-200 dark:border-green-800">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? 'Processing...' : (
                <>
                  {isForgot ? 'Send Link' : (isRegister ? 'Sign Up' : 'Sign In')}
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {isForgot && (
              <button
                type="button"
                onClick={() => setIsForgot(false)}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
              >
                <ArrowLeft size={14} /> Back to login
              </button>
            )}
          </form>
        </div>
      </main>

      <footer className="p-12 text-center text-slate-400 text-sm">
        © 2026 NotionClone. Build for modern teams.
      </footer>
    </div>
  );
}
