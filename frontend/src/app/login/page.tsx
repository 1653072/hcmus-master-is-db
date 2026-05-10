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
  email: z.string().min(1, 'Please enter your email'),
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
      <main className="min-h-screen bg-canvas text-graphite">
        <section className="mx-auto flex min-h-screen max-w-page items-center justify-center px-6 py-12 lg:px-10 xl:px-24">
          <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-xl rounded-[var(--radius-buttons)] bg-white p-8" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember" aria-hidden="true" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-ash">Welcome back</p>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[0.95] tracking-[-0.03em] text-charcoal">Login</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-graphite">Sign in to continue your reading journey, manage your cart, and track orders.</p>
            
            {errors.root && (
              <div className="mt-6 rounded-2xl border border-coral-red/20 bg-coral-red/5 p-4">
                <p className="text-sm font-medium text-coral-red">{errors.root.message}</p>
              </div>
            )}
            <div className="mt-6 space-y-4">
              <div>
                <input 
                  {...register('email')}
                  className={`w-full rounded-full border bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:bg-white focus:ring-2 ${errors.email ? 'border-coral-red/30 focus:border-coral-red focus:ring-coral-red/20' : 'border-stone-surface focus:border-ember focus:ring-ember/20'}`} 
                  placeholder="Email" 
                />
                {errors.email && <p className="mt-1 ml-4 text-xs text-coral-red">{errors.email.message}</p>}
              </div>
              
              <div>
                <input 
                  {...register('password')}
                  className={`w-full rounded-full border bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:bg-white focus:ring-2 ${errors.password ? 'border-coral-red/30 focus:border-coral-red focus:ring-coral-red/20' : 'border-stone-surface focus:border-ember focus:ring-ember/20'}`} 
                  placeholder="Password" 
                  type="password" 
                />
                {errors.password && <p className="mt-1 ml-4 text-xs text-coral-red">{errors.password.message}</p>}
              </div>
            </div>
            
            <Button 
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
            
            <p className="mt-4 text-sm text-graphite">No account yet? <Link className="font-medium text-ember hover:text-ember/80" href="/register">Register</Link></p>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}
