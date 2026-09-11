import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../../api/customers';
import { useAuth } from '../../context/AuthContext';
import { Table, Column } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { CustomerStatusBadge } from '../../components/Badge';
import { Customer, CustomerStatus, CustomerType } from '../../types';

export function CustomersListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CustomerStatus | ''>('');
  const [customerType, setCustomerType] = useState<CustomerType | ''>('');

  const { data, isLoading, error } = useCustomers({
    page,
    pageSize: 10,
    search: search || undefined,
    status: status || undefined,
    customerType: customerType || undefined,
  });

  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';

  const columns: Column<Customer>[] = [
    { header: 'Name', cell: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
    { header: 'Business', cell: (c) => c.businessName },
    { header: 'Mobile', cell: (c) => c.mobile },
    { header: 'Type', cell: (c) => c.customerType },
    { header: 'Status', cell: (c) => <CustomerStatusBadge status={c.status} /> },
    { header: 'Follow-up', cell: (c) => (c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : '—') },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Manage leads, active accounts, and follow-ups.</p>
        </div>
        {canCreate && <Button onClick={() => navigate('/customers/new')}>Add Customer</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name, mobile, email, business..."
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          className="max-w-[160px]"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CustomerStatus | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
        <Select
          className="max-w-[160px]"
          value={customerType}
          onChange={(e) => {
            setCustomerType(e.target.value as CustomerType | '');
            setPage(1);
          }}
        >
          <option value="">All types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </Select>
      </div>

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && data.data.length === 0 && <EmptyState title="No customers found" description="Try adjusting your filters." />}
      {data && data.data.length > 0 && (
        <>
          <Table columns={columns} rows={data.data} rowKey={(c) => c.id} onRowClick={(c) => navigate(`/customers/${c.id}`)} />
          <Pagination pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
