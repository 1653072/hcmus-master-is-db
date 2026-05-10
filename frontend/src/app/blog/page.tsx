import { RouteShell } from '@/components/layout/RouteShell';

export default function Page() {
  return (
    <RouteShell title="Blog" subtitle="News and articles.">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="rounded-cards-lg bg-white p-6" style={{ boxShadow: 'var(--shadow-subtle)' }}>
          <p className="text-[15px] text-graphite">No posts available yet.</p>
        </div>
      </section>
    </RouteShell>
  );
}
