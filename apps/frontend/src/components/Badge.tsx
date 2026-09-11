type Tone = 'green' | 'amber' | 'gray' | 'red' | 'blue';

const toneClasses: Record<Tone, string> = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  gray: 'bg-slate-100 text-slate-700',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

const customerStatusTone: Record<string, Tone> = { LEAD: 'amber', ACTIVE: 'green', INACTIVE: 'gray' };
const challanStatusTone: Record<string, Tone> = { DRAFT: 'amber', CONFIRMED: 'green', CANCELLED: 'gray' };
const movementTone: Record<string, Tone> = { IN: 'green', OUT: 'blue' };

export function CustomerStatusBadge({ status }: { status: string }) {
  return <Badge tone={customerStatusTone[status] ?? 'gray'}>{status}</Badge>;
}
export function ChallanStatusBadge({ status }: { status: string }) {
  return <Badge tone={challanStatusTone[status] ?? 'gray'}>{status}</Badge>;
}
export function MovementTypeBadge({ type }: { type: string }) {
  return <Badge tone={movementTone[type] ?? 'gray'}>{type}</Badge>;
}
