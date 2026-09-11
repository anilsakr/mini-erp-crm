import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCategories, useCreateProduct, useWarehouses } from '../../api/products';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { FormField } from '../../components/FormField';
import { ErrorState } from '../../components/ErrorState';

const schema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  categoryId: z.string().uuid('Select a category'),
  warehouseId: z.string().uuid('Select a warehouse'),
  unitPrice: z.coerce.number().nonnegative('Unit price cannot be negative'),
  currentStock: z.coerce.number().int().nonnegative('Stock cannot be negative'),
  minStockAlert: z.coerce.number().int().nonnegative('Minimum stock cannot be negative'),
});
type FormValues = z.infer<typeof schema>;

export function ProductFormPage() {
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: warehouses } = useWarehouses();
  const createProduct = useCreateProduct();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currentStock: 0, minStockAlert: 0 } });

  async function onSubmit(values: FormValues) {
    const product = await createProduct.mutateAsync(values);
    navigate(`/products/${product.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Add Product</h1>
      <form className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Product Name" error={errors.name?.message} required>
          <Input {...register('name')} />
        </FormField>
        <FormField label="SKU / Code" error={errors.sku?.message} required>
          <Input {...register('sku')} />
        </FormField>
        <FormField label="Category" error={errors.categoryId?.message} required>
          <Select {...register('categoryId')} defaultValue="">
            <option value="" disabled>
              Select category
            </option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Warehouse / Location" error={errors.warehouseId?.message} required>
          <Select {...register('warehouseId')} defaultValue="">
            <option value="" disabled>
              Select warehouse
            </option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.location})
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Unit Price (₹)" error={errors.unitPrice?.message} required>
          <Input type="number" step="0.01" {...register('unitPrice')} />
        </FormField>
        <FormField label="Minimum Stock Alert" error={errors.minStockAlert?.message} required>
          <Input type="number" {...register('minStockAlert')} />
        </FormField>
        <FormField label="Opening Stock" error={errors.currentStock?.message} required>
          <Input type="number" {...register('currentStock')} />
        </FormField>

        {createProduct.isError && (
          <div className="sm:col-span-2">
            <ErrorState message={(createProduct.error as Error).message} />
          </div>
        )}

        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" isLoading={isSubmitting}>
            Create Product
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/products')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
