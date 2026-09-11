import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateCustomer } from '../../api/customers';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { FormField } from '../../components/FormField';
import { ErrorState } from '../../components/ErrorState';

const schema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  mobile: z.string().min(7, 'Enter a valid mobile number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  businessName: z.string().min(1, 'Business name is required'),
  gstNumber: z.string().optional(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CustomerFormPage() {
  const navigate = useNavigate();
  const createCustomer = useCreateCustomer();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { customerType: 'RETAIL', status: 'LEAD' } });

  async function onSubmit(values: FormValues) {
    const customer = await createCustomer.mutateAsync(values);
    navigate(`/customers/${customer.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Add Customer</h1>
      <form className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Customer Name" error={errors.name?.message} required>
          <Input {...register('name')} />
        </FormField>
        <FormField label="Mobile Number" error={errors.mobile?.message} required>
          <Input {...register('mobile')} />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <Input type="email" {...register('email')} />
        </FormField>
        <FormField label="Business Name" error={errors.businessName?.message} required>
          <Input {...register('businessName')} />
        </FormField>
        <FormField label="GST Number (optional)" error={errors.gstNumber?.message}>
          <Input {...register('gstNumber')} />
        </FormField>
        <FormField label="Customer Type" error={errors.customerType?.message} required>
          <Select {...register('customerType')}>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </Select>
        </FormField>
        <FormField label="Status" error={errors.status?.message} required>
          <Select {...register('status')}>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </FormField>
        <FormField label="Follow-up Date" error={errors.followUpDate?.message}>
          <Input type="date" {...register('followUpDate')} />
        </FormField>
        <FormField label="Address" error={errors.address?.message} required>
          <Input {...register('address')} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Notes" error={errors.notes?.message}>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              {...register('notes')}
            />
          </FormField>
        </div>

        {createCustomer.isError && (
          <div className="sm:col-span-2">
            <ErrorState message={(createCustomer.error as Error).message} />
          </div>
        )}

        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" isLoading={isSubmitting}>
            Create Customer
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/customers')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
