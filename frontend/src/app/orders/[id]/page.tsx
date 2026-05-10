import { RouteShell } from '@/components/layout/RouteShell';

export default function Page() {
  return (
    <RouteShell title="Order detail">
      <section className="mx-auto max-w-page px-6 pb-16 pt-10 lg:px-10 xl:px-24">
        <div className="rounded-cards bg-white p-6" style={{ boxShadow: '#f2f0ed 0px 0px 0px 1px inset' }}>
          <p className="text-[15px] text-graphite">Order details will appear here.</p>
        </div>
      </section>
    </RouteShell>
  );
}
