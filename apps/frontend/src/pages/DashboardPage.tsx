import { Link } from 'react-router-dom';
import { useDashboardSummary } from '../api/dashboard';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { ChallanStatusBadge, MovementTypeBadge } from '../components/Badge';

function StatCard({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'warning' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === 'warning' ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, error } = useDashboardSummary();

  if (isLoading) return <Loading label="Loading dashboard..." />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">A snapshot of customers, inventory, and sales activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Customers" value={data.customers.total} />
        <StatCard label="Active Customers" value={data.customers.active} />
        <StatCard label="Total Products" value={data.products.total} />
        <StatCard label="Low Stock" value={data.products.lowStock} tone={data.products.lowStock > 0 ? 'warning' : 'default'} />
        <StatCard label="Draft Challans" value={data.challans.draft} />
        <StatCard label="Confirmed Challans" value={data.challans.confirmed} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Recent Challans</h2>
            <Link to="/challans" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.challans.recent.map((challan) => (
              <li key={challan.id} className="flex items-center justify-between py-2 text-sm">
                <Link to={`/challans/${challan.id}`} className="font-medium text-slate-700 hover:text-indigo-600">
                  {challan.challanNumber}
                </Link>
                <span className="text-slate-500">{challan.customer.businessName}</span>
                <ChallanStatusBadge status={challan.status} />
              </li>
            ))}
            {data.challans.recent.length === 0 && <p className="py-4 text-sm text-slate-400">No challans yet.</p>}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-medium text-slate-900">Recent Stock Movements</h2>
          <ul className="divide-y divide-slate-100">
            {data.recentStockMovements.map((movement) => (
              <li key={movement.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-slate-700">{movement.product?.name}</span>
                <span className="text-slate-500">{movement.quantityChanged}</span>
                <MovementTypeBadge type={movement.movementType} />
              </li>
            ))}
            {data.recentStockMovements.length === 0 && <p className="py-4 text-sm text-slate-400">No movements yet.</p>}
          </ul>
        </section>
      </div>
    </div>
  );
}
