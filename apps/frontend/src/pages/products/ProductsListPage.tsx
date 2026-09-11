import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories, useProducts } from '../../api/products';
import { useAuth } from '../../context/AuthContext';
import { Table, Column } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { Product } from '../../types';

export function ProductsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data: categories } = useCategories();
  const { data, isLoading, error } = useProducts({
    page,
    pageSize: 10,
    search: search || undefined,
    categoryId: categoryId || undefined,
    lowStockOnly: lowStockOnly || undefined,
  });

  const canCreate = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const columns: Column<Product>[] = [
    { header: 'Name', cell: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
    { header: 'SKU', cell: (p) => p.sku },
    { header: 'Category', cell: (p) => p.category.name },
    { header: 'Unit Price', cell: (p) => `₹${Number(p.unitPrice).toFixed(2)}` },
    {
      header: 'Stock',
      cell: (p) => (
        <span className={p.currentStock <= p.minStockAlert ? 'font-semibold text-red-600' : ''}>
          {p.currentStock}
          {p.currentStock <= p.minStockAlert && ' (Low)'}
        </span>
      ),
    },
    { header: 'Warehouse', cell: (p) => p.warehouse.name },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Catalog and inventory levels.</p>
        </div>
        {canCreate && <Button onClick={() => navigate('/products/new')}>Add Product</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name or SKU..."
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          className="max-w-[180px]"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
          />
          Low stock only
        </label>
      </div>

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} />}
      {data && data.data.length === 0 && <EmptyState title="No products found" description="Try adjusting your filters." />}
      {data && data.data.length > 0 && (
        <>
          <Table columns={columns} rows={data.data} rowKey={(p) => p.id} onRowClick={(p) => navigate(`/products/${p.id}`)} />
          <Pagination pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
