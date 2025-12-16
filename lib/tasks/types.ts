export type TaskStatus = 'inbox' | 'todo' | 'doing' | 'done' | 'archived';

export interface Task {
  id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export const TASK_STATUSES: TaskStatus[] = ['inbox', 'todo', 'doing', 'done', 'archived'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  todo: 'To Do',
  doing: 'Doing',
  done: 'Done',
  archived: 'Archived',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  inbox: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  todo: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  doing: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  done: 'bg-green-500/10 text-green-600 dark:text-green-400',
  archived: 'bg-gray-500/10 text-gray-500 dark:text-gray-500',
};
