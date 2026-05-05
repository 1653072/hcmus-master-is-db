'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Page() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      await authApi.register(data);
      toast.success('Account created successfully! Please log in.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-800">
      <section className="mx-auto flex min-h-screen max-w-[1280px] items-center justify-center px-6 py-12 lg:px-10 xl:px-14">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full rounded-[32px] border border-stone-200 bg-white/90 p-8 shadow-[0_14px_36px_rgba(68,53,33,0.08)] lg:max-w-2xl">
          <div className="h-1.5 w-14 rounded-full bg-orange-200" aria-hidden="true" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Create account</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[0.95] tracking-[-0.03em] text-zinc-900">Register</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-600">Create an account to save favourites, place orders faster, and keep track of your reading history.</p>
          
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <input 
                {...register('full_name')}
                className={`w-full rounded-full border bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 ${errors.full_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-stone-200 focus:border-orange-300 focus:ring-orange-500/20'}`} 
                placeholder="Full name" 
              />
              {errors.full_name && <p className="mt-1 ml-4 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>
            
            <div>
              <input 
                {...register('phone')}
                className={`w-full rounded-full border bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 ${errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-stone-200 focus:border-orange-300 focus:ring-orange-500/20'}`} 
                placeholder="Phone" 
              />
              {errors.phone && <p className="mt-1 ml-4 text-xs text-red-500">{errors.phone.message}</p>}
            </div>
            
            <div className="md:col-span-2">
              <input 
                {...register('email')}
                className={`w-full rounded-full border bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-stone-200 focus:border-orange-300 focus:ring-orange-500/20'}`} 
                placeholder="Email" 
              />
              {errors.email && <p className="mt-1 ml-4 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            
            <div className="md:col-span-2">
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
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
          
          <p className="mt-4 text-sm text-zinc-600">Already have an account? <Link className="font-medium text-orange-600 hover:text-orange-700" href="/login">Sign in</Link></p>
        </form>
      </section>
    </main>
  );
}
