import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/customers', label: 'Customers', roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
  { to: '/products', label: 'Products' },
  { to: '/challans', label: 'Challans' },
  { to: '/profile', label: 'Profile' },
];

export function AppShell() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white sm:flex">
        <div className="px-5 py-5">
          <p className="text-base font-semibold text-slate-900">Mini ERP + CRM</p>
          <p className="text-xs text-slate-500">Operations Portal</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-4 py-4">
          <p className="text-sm font-medium text-slate-800">{user.name}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">{user.role}</p>
          <button onClick={logout} className="mt-2 text-xs font-medium text-indigo-600 hover:underline">
            Log out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          <p className="text-sm font-semibold text-slate-900">Mini ERP + CRM</p>
          <button onClick={logout} className="text-xs font-medium text-indigo-600">
            Log out ({user.role})
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
