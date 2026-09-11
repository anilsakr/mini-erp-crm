import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../../api/customers';
import { useProducts } from '../../api/products';
import { useCreateChallan } from '../../api/challans';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { Input } from '../../components/Input';
import { FormField } from '../../components/FormField';
import { ErrorState } from '../../components/ErrorState';

interface LineItem {
  productId: string;
  quantity: number;
}

export function ChallanFormPage() {
  const navigate = useNavigate();
  const { data: customers } = useCustomers({ page: 1, pageSize: 100 });
  // pageSize is capped at 100 by the backend's listProductsSchema; a
  // searchable/paginated picker would be needed if the catalog ever grows
  // past that (documented in Known Limitations).
  const { data: products } = useProducts({ page: 1, pageSize: 100 });
  const createChallan = useCreateChallan();

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: 1 }]);
  const [formError, setFormError] = useState<string | null>(null);

  const productById = useMemo(() => new Map((products?.data ?? []).map((p) => [p.id, p])), [products]);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const lineTotals = items.map((item) => {
    const product = productById.get(item.productId);
    const unitPrice = product ? Number(product.unitPrice) : 0;
    return { unitPrice, lineTotal: unitPrice * (item.quantity || 0) };
  });
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalAmount = lineTotals.reduce((sum, l) => sum + l.lineTotal, 0);

  async function onSubmit() {
    setFormError(null);
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (!customerId) {
      setFormError('Please select a customer');
      return;
    }
    if (validItems.length === 0) {
      setFormError('Add at least one product with a quantity greater than zero');
      return;
    }
    try {
      const challan = await createChallan.mutateAsync({ customerId, items: validItems });
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">New Sales Challan</h1>

      <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6">
        <FormField label="Customer" required>
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.businessName}
              </option>
            ))}
          </Select>
        </FormField>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Line Items</p>
          <div className="flex flex-col gap-3">
            {items.map((item, index) => {
              const product = productById.get(item.productId);
              return (
                <div key={index} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_120px_120px_120px_auto]">
                  <FormField label="Product">
                    <Select value={item.productId} onChange={(e) => updateItem(index, { productId: e.target.value })}>
                      <option value="">Select product</option>
                      {products?.data.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — stock: {p.currentStock}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Quantity">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                    />
                  </FormField>
                  <FormField label="Unit Price">
                    <Input readOnly value={product ? `₹${Number(product.unitPrice).toFixed(2)}` : '—'} />
                  </FormField>
                  <FormField label="Line Total">
                    <Input readOnly value={`₹${lineTotals[index].lineTotal.toFixed(2)}`} />
                  </FormField>
                  <Button type="button" variant="ghost" onClick={() => removeItem(index)} disabled={items.length === 1}>
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
          <Button type="button" variant="secondary" className="mt-3" onClick={addItem}>
            + Add Product
          </Button>
        </div>

        <div className="flex justify-end gap-8 border-t border-slate-100 pt-4 text-sm">
          <div>
            <p className="text-slate-500">Total Quantity</p>
            <p className="text-lg font-semibold text-slate-900">{totalQuantity}</p>
          </div>
          <div>
            <p className="text-slate-500">Total Amount</p>
            <p className="text-lg font-semibold text-slate-900">₹{totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {formError && <ErrorState message={formError} />}

        <div className="flex gap-2">
          <Button onClick={onSubmit} isLoading={createChallan.isPending}>
            Save as Draft
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/challans')}>
            Cancel
          </Button>
        </div>
        <p className="text-xs text-slate-400">
          Saving creates a Draft only — stock is not affected until you confirm the challan from its detail page.
        </p>
      </div>
    </div>
  );
}
