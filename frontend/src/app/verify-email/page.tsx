'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import { CheckCircle, XCircle, Loader2, Layout } from 'lucide-react';

function VerifyEmailContent() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    useEffect(() => {
        if (token) {
            verify();
        } else {
            setStatus('error');
            setMessage('Invalid verification link.');
        }
    }, [token]);

    const verify = async () => {
        try {
            await api.get(`/auth/verify-email?token=${token}`);
            setStatus('success');
            setMessage('Your email has been verified successfully!');
        } catch (err: any) {
            setStatus('error');
            setMessage(err.response?.data?.error || 'Verification failed.');
        }
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
            <div className="flex justify-center">
                {status === 'loading' && <Loader2 size={48} className="text-blue-600 animate-spin" />}
                {status === 'success' && <CheckCircle size={48} className="text-green-500" />}
                {status === 'error' && <XCircle size={48} className="text-red-500" />}
            </div>
            
            <h1 className="text-2xl font-bold">
                {status === 'loading' && 'Verifying Email...'}
                {status === 'success' && 'Email Verified!'}
                {status === 'error' && 'Verification Error'}
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400">
                {message}
            </p>

            {status !== 'loading' && (
                <button 
                    onClick={() => router.push('/')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl transition-all shadow-lg shadow-blue-500/30"
                >
                    Back to Login
                </button>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="flex items-center gap-2 font-bold text-xl mb-12">
                <div className="bg-black dark:bg-white p-1.5 rounded-lg text-white dark:text-black">
                    <Layout size={24} />
                </div>
                <span>NotionClone</span>
            </div>
            <Suspense fallback={<Loader2 className="animate-spin text-blue-600" size={32} />}>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}
