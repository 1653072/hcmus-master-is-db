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

const registerSchema = z.object({
  full_name: z.string().min(2, 'Họ tên cần ít nhất 2 ký tự'),
  phone: z.string().optional(),
  email: z.string().email('Vui lòng nhập email hợp lệ'),
  password: z.string().min(6, 'Mật khẩu cần ít nhất 6 ký tự'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Page() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      await authApi.register(data);
      
      const res = await authApi.login({ email: data.email, password: data.password });
      if (res.access_token && res.user) {
        window.localStorage.setItem('access_token', res.access_token);
        setAuth(res.access_token, res.user);
        toast.success('Tao tai khoan va dang nhap thanh cong.');
        
        if (res.user.role === 'admin') {
          router.push('/admin/books');
        } else {
          router.push('/');
        }
      }
    } catch (error: any) {
      setError('root', {
        type: 'server',
        message: error?.response?.data?.error || 'Không thể đăng ký. Vui lòng thử lại.',
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
          <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl rounded-[var(--radius-buttons)] bg-white p-8" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="h-1.5 w-14 rounded-full bg-ember" aria-hidden="true" />
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.24em] text-ash">Tạo tài khoản</p>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-none text-charcoal">Đăng ký</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-graphite">Luu sach yeu thich, dat hang nhanh va theo doi lich su mua sach cua ban.</p>
            
            {errors.root && (
              <div className="mt-6 rounded-2xl border border-coral-red/20 bg-coral-red/5 p-4">
                <p className="text-sm font-medium text-coral-red">{errors.root.message}</p>
              </div>
            )}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <input 
                  {...register('full_name')}
                  className={`w-full rounded-full border bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:bg-white focus:ring-2 ${errors.full_name ? 'border-coral-red/30 focus:border-coral-red focus:ring-coral-red/20' : 'border-stone-surface focus:border-ember focus:ring-ember/20'}`} 
                  placeholder="Họ tên"
                />
                {errors.full_name && <p className="mt-1 ml-4 text-xs text-coral-red">{errors.full_name.message}</p>}
              </div>
              
              <div>
                <input 
                  {...register('phone')}
                  className={`w-full rounded-full border bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:bg-white focus:ring-2 ${errors.phone ? 'border-coral-red/30 focus:border-coral-red focus:ring-coral-red/20' : 'border-stone-surface focus:border-ember focus:ring-ember/20'}`} 
                  placeholder="Điện thoại"
                />
                {errors.phone && <p className="mt-1 ml-4 text-xs text-coral-red">{errors.phone.message}</p>}
              </div>
              
              <div className="md:col-span-2">
                <input 
                  {...register('email')}
                  className={`w-full rounded-full border bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:bg-white focus:ring-2 ${errors.email ? 'border-coral-red/30 focus:border-coral-red focus:ring-coral-red/20' : 'border-stone-surface focus:border-ember focus:ring-ember/20'}`} 
                  placeholder="Email" 
                />
                {errors.email && <p className="mt-1 ml-4 text-xs text-coral-red">{errors.email.message}</p>}
              </div>
              
              <div className="md:col-span-2">
                <input 
                  {...register('password')}
                  className={`w-full rounded-full border bg-parchment px-4 py-3 text-sm outline-none transition placeholder:text-smoke focus:bg-white focus:ring-2 ${errors.password ? 'border-coral-red/30 focus:border-coral-red focus:ring-coral-red/20' : 'border-stone-surface focus:border-ember focus:ring-ember/20'}`} 
                  placeholder="Mật khẩu"
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
              {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </Button>
            
            <p className="mt-4 text-sm text-graphite">Đã có tài khoản? <Link className="font-medium text-ember hover:text-coral-red" href="/login">Đăng nhập</Link></p>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}
