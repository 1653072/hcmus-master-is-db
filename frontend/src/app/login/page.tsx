'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Footer } from '@/components/layout/Footer';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Page() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      const res = await authApi.login(data);
      if (res.access_token && res.user) {
        window.localStorage.setItem('access_token', res.access_token);
        setAuth(res.access_token, res.user);
        toast.success('Logged in successfully!');
        
        if (res.user.role === 'admin') {
          router.push('/admin/books');
        } else {
          router.push('/');
        }
      }
    } catch (error: any) {
      setError('root', {
        type: 'server',
        message: error?.response?.data?.error || 'Failed to login. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-stone-50 text-zinc-800">
        <section className="mx-auto flex min-h-screen max-w-[1280px] items-center justify-center px-6 py-12 lg:px-10 xl:px-14">
          <form onSubmit={handleSubmit(onSubmit)} className="w-full rounded-[32px] border border-stone-200 bg-white/90 p-8 shadow-[0_14px_36px_rgba(68,53,33,0.08)] lg:max-w-xl">
            <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Welcome back</p>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[0.95] tracking-[-0.03em] text-zinc-900">Login</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-600">Sign in to continue your reading journey, manage your cart, and track orders.</p>
            
            {errors.root && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-4">
                <p className="text-sm font-medium text-red-600">{errors.root.message}</p>
              </div>
            )}
            <div className="mt-6 space-y-4">
              <div>
                <input 
                  {...register('email')}
                  className={`w-full rounded-full border bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-stone-200 focus:border-orange-300 focus:ring-orange-500/20'}`} 
                  placeholder="Email" 
                />
                {errors.email && <p className="mt-1 ml-4 text-xs text-red-500">{errors.email.message}</p>}
              </div>
              
              <div>
                <input 
                  {...register('password')}
                  className={`w-full rounded-full border bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-stone-200 focus:border-orange-300 focus:ring-orange-500/20'}`} 
                  placeholder="Password" 
                  type="password" 
                />
                {errors.password && <p className="mt-1 ml-4 text-xs text-red-500">{errors.password.message}</p>}
              </div>
            </div>
            
            <Button 
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
            
            <p className="mt-4 text-sm text-zinc-600">No account yet? <Link className="font-medium text-orange-600 hover:text-orange-700" href="/register">Register</Link></p>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}
