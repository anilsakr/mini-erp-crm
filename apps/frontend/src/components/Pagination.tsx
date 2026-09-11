import { Pagination as PaginationMeta } from '../types';
import { Button } from './Button';

export function Pagination({ pagination, onPageChange }: { pagination: PaginationMeta; onPageChange: (page: number) => void }) {
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
      <span>
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
