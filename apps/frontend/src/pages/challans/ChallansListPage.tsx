import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChallans } from '../../api/challans';
import { useAuth } from '../../context/AuthContext';
import { Table, Column } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { ChallanStatusBadge } from '../../components/Badge';
import { Challan, ChallanStatus } from '../../types';

export function ChallansListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ChallanStatus | ''>('');

  const { data, isLoading, error } = useChallans({ page, pageSize: 10, status: status || undefined });
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';

  const columns: Column<Challan>[] = [
    { header: 'Challan #', cell: (c) => <span className="font-medium text-slate-900">{c.challanNumber}</span> },
    { header: 'Customer', cell: (c) => c.customer.businessName },
    { header: 'Status', cell: (c) => <ChallanStatusBadge status={c.status} /> },
    { header: 'Total Qty', cell: (c) => c.totalQuantity },
    { header: 'Total Amount', cell: (c) => `₹${Number(c.totalAmount).toFixed(2)}` },
    { header: 'Created', cell: (c) => new Date(c.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sales Challans</h1>
          <p className="text-sm text-slate-500">Draft, confirm, and track outgoing stock.</p>
        </div>
        {canCreate && <Button onClick={() => navigate('/challans/new')}>New Challan</Button>}
      </div>

      <Select
        className="max-w-[180px]"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as ChallanStatus | '');
          setPage(1);
        }}
      >
        <option value="">All statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="CONFIRMED">Confirmed</option>
        <option value="CANCELLED">Cancelled</option>
      </Select>

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && data.data.length === 0 && <EmptyState title="No challans found" description="Try adjusting your filters." />}
      {data && data.data.length > 0 && (
        <>
          <Table columns={columns} rows={data.data} rowKey={(c) => c.id} onRowClick={(c) => navigate(`/challans/${c.id}`)} />
          <Pagination pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
