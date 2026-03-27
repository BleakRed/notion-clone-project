'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import { Layout, ChevronRight, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';

function ResetPasswordContent() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!token) {
            setError('Invalid reset link');
            return;
        }

        setStatus('loading');
        try {
            await api.post('/auth/reset-password', { token, password });
            setStatus('success');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Reset failed');
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
                <CheckCircle size={48} className="text-green-500 mx-auto" />
                <h1 className="text-2xl font-bold">Password Reset!</h1>
                <p className="text-slate-500 dark:text-slate-400">Your password has been reset successfully. You can now login with your new password.</p>
                <button 
                    onClick={() => router.push('/')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl transition-all shadow-lg shadow-blue-500/30"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <h1 className="text-2xl font-bold text-center">Set New Password</h1>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm">Enter your new secure password below.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1 tracking-wider">New Password</label>
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

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-500 text-xs p-3 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
                        <XCircle size={14} /> {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                    {status === 'loading' ? 'Updating...' : (
                        <>
                            Reset Password
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="flex items-center gap-2 font-bold text-xl mb-12">
                <div className="bg-black dark:bg-white p-1.5 rounded-lg text-white dark:text-black">
                    <Layout size={24} />
                </div>
                <span>NotionClone</span>
            </div>
            <Suspense fallback={<Loader2 className="animate-spin text-blue-600" size={32} />}>
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
