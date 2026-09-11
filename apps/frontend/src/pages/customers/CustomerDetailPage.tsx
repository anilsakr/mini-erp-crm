import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { useAddFollowUp, useCustomer, useUpdateCustomer } from '../../api/customers';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../../components/Loading';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { FormField } from '../../components/FormField';
import { CustomerStatusBadge } from '../../components/Badge';
import { CustomerFormInput } from '../../api/customers';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: customer, isLoading, error } = useCustomer(id);
  const updateCustomer = useUpdateCustomer(id!);
  const addFollowUp = useAddFollowUp(id!);
  const [isEditing, setIsEditing] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const canEdit = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { register, handleSubmit, reset } = useForm<CustomerFormInput>();

  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!customer) return null;

  function startEditing() {
    reset({
      name: customer!.name,
      mobile: customer!.mobile,
      email: customer!.email ?? '',
      businessName: customer!.businessName,
      gstNumber: customer!.gstNumber ?? '',
      customerType: customer!.customerType,
      address: customer!.address,
      status: customer!.status,
      notes: customer!.notes ?? '',
    });
    setIsEditing(true);
  }

  async function onSave(values: CustomerFormInput) {
    await updateCustomer.mutateAsync(values);
    setIsEditing(false);
  }

  async function onAddFollowUp() {
    if (!followUpNote.trim()) return;
    await addFollowUp.mutateAsync({ note: followUpNote, followUpDate: followUpDate || undefined });
    setFollowUpNote('');
    setFollowUpDate('');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{customer.name}</h1>
          <p className="text-sm text-slate-500">{customer.businessName}</p>
        </div>
        {canEdit && !isEditing && <Button onClick={startEditing}>Edit Customer</Button>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        {!isEditing ? (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Mobile</dt>
              <dd className="font-medium text-slate-900">{customer.mobile}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{customer.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">GST Number</dt>
              <dd className="font-medium text-slate-900">{customer.gstNumber ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Type</dt>
              <dd className="font-medium text-slate-900">{customer.customerType}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd>
                <CustomerStatusBadge status={customer.status} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Follow-up Date</dt>
              <dd className="font-medium text-slate-900">
                {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Address</dt>
              <dd className="font-medium text-slate-900">{customer.address}</dd>
            </div>
            {customer.notes && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Notes</dt>
                <dd className="font-medium text-slate-900">{customer.notes}</dd>
              </div>
            )}
          </dl>
        ) : (
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSave)}>
            <FormField label="Customer Name" required>
              <Input {...register('name')} />
            </FormField>
            <FormField label="Mobile Number" required>
              <Input {...register('mobile')} />
            </FormField>
            <FormField label="Email">
              <Input type="email" {...register('email')} />
            </FormField>
            <FormField label="Business Name" required>
              <Input {...register('businessName')} />
            </FormField>
            <FormField label="GST Number">
              <Input {...register('gstNumber')} />
            </FormField>
            <FormField label="Customer Type" required>
              <Select {...register('customerType')}>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </Select>
            </FormField>
            <FormField label="Status" required>
              <Select {...register('status')}>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </FormField>
            <FormField label="Address" required>
              <Input {...register('address')} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Notes">
                <textarea
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                  {...register('notes')}
                />
              </FormField>
            </div>
            {updateCustomer.isError && (
              <div className="sm:col-span-2">
                <ErrorState message={(updateCustomer.error as Error).message} />
              </div>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" isLoading={updateCustomer.isPending}>
                Save Changes
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-slate-900">Follow-up History</h2>

        {canEdit && (
          <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <FormField label="Add a follow-up note">
                <Input value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="What happened?" />
              </FormField>
            </div>
            <div>
              <FormField label="Next follow-up date">
                <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </FormField>
            </div>
            <Button onClick={onAddFollowUp} isLoading={addFollowUp.isPending} disabled={!followUpNote.trim()}>
              Add
            </Button>
          </div>
        )}

        <ul className="space-y-3">
          {customer.followUps?.map((followUp) => (
            <li key={followUp.id} className="rounded-md bg-slate-50 p-3 text-sm">
              <p className="text-slate-800">{followUp.note}</p>
              <p className="mt-1 text-xs text-slate-400">
                {followUp.createdBy.name} · {new Date(followUp.createdAt).toLocaleString()}
                {followUp.followUpDate && ` · Next follow-up: ${new Date(followUp.followUpDate).toLocaleDateString()}`}
              </p>
            </li>
          ))}
          {(!customer.followUps || customer.followUps.length === 0) && (
            <p className="text-sm text-slate-400">No follow-ups recorded yet.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
