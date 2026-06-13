import type { Task } from '@/types/agents';

const STATUS_STYLES: Record<Task['status'], string> = {
  done: 'bg-green-50 text-green-700 border-green-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-gray-50 text-gray-500 border-gray-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_LABELS: Record<Task['status'], string> = {
  done: 'Done',
  'in-progress': 'In Progress',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

export function TaskBadge({ status }: { status: Task['status'] }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
