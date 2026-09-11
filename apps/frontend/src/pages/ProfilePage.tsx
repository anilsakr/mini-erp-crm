import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Profile</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd className="font-medium text-slate-900">{user.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-900">{user.role}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
