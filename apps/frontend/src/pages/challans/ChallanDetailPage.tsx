import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCancelChallan, useChallan, useConfirmChallan } from '../../api/challans';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ChallanStatusBadge } from '../../components/Badge';
import { Table, Column } from '../../components/Table';
import { ChallanItem } from '../../types';

export function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: challan, isLoading, error } = useChallan(id);
  const confirmChallan = useConfirmChallan();
  const cancelChallan = useCancelChallan();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canAct = user?.role === 'ADMIN' || user?.role === 'SALES';

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!challan) return null;

  const columns: Column<ChallanItem>[] = [
    { header: 'Product', cell: (item) => item.productNameSnapshot },
    { header: 'SKU', cell: (item) => item.skuSnapshot },
    { header: 'Unit Price', cell: (item) => `₹${Number(item.unitPriceSnapshot).toFixed(2)}` },
    { header: 'Quantity', cell: (item) => item.quantity },
    { header: 'Line Total', cell: (item) => `₹${Number(item.lineTotal).toFixed(2)}` },
  ];

  async function handleConfirm() {
    setActionError(null);
    try {
      await confirmChallan.mutateAsync(id!);
      setShowConfirmDialog(false);
    } catch (err) {
      setActionError((err as Error).message);
      setShowConfirmDialog(false);
    }
  }

  async function handleCancel() {
    setActionError(null);
    try {
      await cancelChallan.mutateAsync(id!);
      setShowCancelDialog(false);
    } catch (err) {
      setActionError((err as Error).message);
      setShowCancelDialog(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{challan.challanNumber}</h1>
          <p className="text-sm text-slate-500">
            {challan.customer.name} — {challan.customer.businessName}
          </p>
        </div>
        <ChallanStatusBadge status={challan.status} />
      </div>

      {actionError && <ErrorState message={actionError} />}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Created By</dt>
            <dd className="font-medium text-slate-900">{challan.createdBy.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Created On</dt>
            <dd className="font-medium text-slate-900">{new Date(challan.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Total Quantity</dt>
            <dd className="font-medium text-slate-900">{challan.totalQuantity}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Total Amount</dt>
            <dd className="font-medium text-slate-900">₹{Number(challan.totalAmount).toFixed(2)}</dd>
          </div>
        </dl>
      </div>

      <Table columns={columns} rows={challan.items} rowKey={(item) => item.id} />

      {canAct && challan.status === 'DRAFT' && (
        <div className="flex gap-2">
          <Button onClick={() => setShowConfirmDialog(true)}>Confirm Challan</Button>
          <Button variant="danger" onClick={() => setShowCancelDialog(true)}>
            Cancel Challan
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={showConfirmDialog}
        title="Confirm this challan?"
        description="This will validate and reduce stock for every line item, and cannot be undone. If any item has insufficient stock, the whole confirmation is rejected and nothing changes."
        confirmLabel="Confirm Challan"
        isLoading={confirmChallan.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirmDialog(false)}
      />
      <ConfirmDialog
        open={showCancelDialog}
        title="Cancel this draft challan?"
        description="This challan has not affected stock yet, so cancelling is safe and immediate."
        confirmLabel="Cancel Challan"
        danger
        isLoading={cancelChallan.isPending}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </div>
  );
}
