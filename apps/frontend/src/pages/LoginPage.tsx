import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { FormField } from '../components/FormField';
import { ErrorState } from '../components/ErrorState';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

const demoAccounts = [
  { role: 'Admin', email: 'admin@example.com' },
  { role: 'Sales', email: 'sales@example.com' },
  { role: 'Warehouse', email: 'warehouse@example.com' },
  { role: 'Accounts', email: 'accounts@example.com' },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err) {
      setServerError((err as Error).message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Mini ERP + CRM</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to the operations portal</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" autoComplete="username" {...register('email')} />
          </FormField>
          <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          </FormField>

          {serverError && <ErrorState message={serverError} />}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Demo accounts (password: Password123!)
          </p>
          <ul className="space-y-1 text-xs text-slate-500">
            {demoAccounts.map((acc) => (
              <li key={acc.email}>
                <button
                  type="button"
                  className="font-medium text-indigo-600 hover:underline"
                  onClick={() => {
                    setValue('email', acc.email);
                    setValue('password', 'Password123!');
                  }}
                >
                  {acc.role}
                </button>
                {' — '}
                {acc.email}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
