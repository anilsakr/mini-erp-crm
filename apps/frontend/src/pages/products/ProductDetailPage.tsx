import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import {
  useCategories,
  useCreateStockMovement,
  useProduct,
  useProductStockMovements,
  useUpdateProduct,
  useWarehouses,
} from '../../api/products';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { FormField } from '../../components/FormField';
import { MovementTypeBadge } from '../../components/Badge';
import { Table, Column } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { StockMovement } from '../../types';

interface EditForm {
  name: string;
  sku: string;
  categoryId: string;
  warehouseId: string;
  unitPrice: number;
  minStockAlert: number;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: product, isLoading, error } = useProduct(id);
  const { data: categories } = useCategories();
  const { data: warehouses } = useWarehouses();
  const updateProduct = useUpdateProduct(id!);
  const createMovement = useCreateStockMovement();

  const [isEditing, setIsEditing] = useState(false);
  const [movementPage, setMovementPage] = useState(1);
  const { data: movements } = useProductStockMovements(id, movementPage, 10);

  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const canEditProduct = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';
  const canAdjustStock = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const { register, handleSubmit, reset } = useForm<EditForm>();

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!product) return null;

  function startEditing() {
    reset({
      name: product!.name,
      sku: product!.sku,
      categoryId: product!.categoryId,
      warehouseId: product!.warehouseId,
      unitPrice: Number(product!.unitPrice),
      minStockAlert: product!.minStockAlert,
    });
    setIsEditing(true);
  }

  async function onSave(values: EditForm) {
    await updateProduct.mutateAsync(values);
    setIsEditing(false);
  }

  async function onAdjustStock() {
    const qty = Number(quantity);
    if (!qty || qty <= 0 || !reason.trim()) return;
    await createMovement.mutateAsync({ productId: id!, quantityChanged: qty, movementType, reason });
    setQuantity('');
    setReason('');
  }

  const movementColumns: Column<StockMovement>[] = [
    { header: 'Type', cell: (m) => <MovementTypeBadge type={m.movementType} /> },
    { header: 'Quantity', cell: (m) => m.quantityChanged },
    { header: 'Reason', cell: (m) => m.reason },
    { header: 'By', cell: (m) => m.createdBy.name },
    { header: 'When', cell: (m) => new Date(m.createdAt).toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-500">SKU: {product.sku}</p>
        </div>
        {canEditProduct && !isEditing && <Button onClick={startEditing}>Edit Product</Button>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        {!isEditing ? (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Category</dt>
              <dd className="font-medium text-slate-900">{product.category.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Warehouse</dt>
              <dd className="font-medium text-slate-900">
                {product.warehouse.name} ({product.warehouse.location})
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Unit Price</dt>
              <dd className="font-medium text-slate-900">₹{Number(product.unitPrice).toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Current Stock</dt>
              <dd className={`font-semibold ${product.currentStock <= product.minStockAlert ? 'text-red-600' : 'text-slate-900'}`}>
                {product.currentStock} {product.currentStock <= product.minStockAlert && '(Low stock)'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Minimum Stock Alert</dt>
              <dd className="font-medium text-slate-900">{product.minStockAlert}</dd>
            </div>
          </dl>
        ) : (
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-3" onSubmit={handleSubmit(onSave)}>
            <FormField label="Product Name" required>
              <Input {...register('name')} />
            </FormField>
            <FormField label="SKU" required>
              <Input {...register('sku')} />
            </FormField>
            <FormField label="Unit Price" required>
              <Input type="number" step="0.01" {...register('unitPrice')} />
            </FormField>
            <FormField label="Category" required>
              <Select {...register('categoryId')}>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Warehouse" required>
              <Select {...register('warehouseId')}>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Minimum Stock Alert" required>
              <Input type="number" {...register('minStockAlert')} />
            </FormField>
            {updateProduct.isError && (
              <div className="sm:col-span-3">
                <ErrorState message={(updateProduct.error as Error).message} />
              </div>
            )}
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" isLoading={updateProduct.isPending}>
                Save Changes
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {canAdjustStock && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-medium text-slate-900">Stock Adjustment</h2>
          <p className="mb-4 text-xs text-slate-500">
            Every adjustment is recorded as an auditable stock movement — current stock is never edited directly.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField label="Type">
              <Select value={movementType} onChange={(e) => setMovementType(e.target.value as 'IN' | 'OUT')}>
                <option value="IN">IN (add stock)</option>
                <option value="OUT">OUT (remove stock)</option>
              </Select>
            </FormField>
            <FormField label="Quantity">
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </FormField>
            <FormField label="Reason">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Supplier restock" />
            </FormField>
            <Button onClick={onAdjustStock} isLoading={createMovement.isPending}>
              Record Movement
            </Button>
          </div>
          {createMovement.isError && <div className="mt-3"><ErrorState message={(createMovement.error as Error).message} /></div>}
        </div>
      )}

      <div>
        <h2 className="mb-3 font-medium text-slate-900">Stock Movement History</h2>
        {movements && movements.data.length > 0 ? (
          <>
            <Table columns={movementColumns} rows={movements.data} rowKey={(m) => m.id} />
            <Pagination pagination={movements.pagination} onPageChange={setMovementPage} />
          </>
        ) : (
          <p className="text-sm text-slate-400">No stock movements recorded yet.</p>
        )}
      </div>
    </div>
  );
}
