export interface TimeEntry {
  id: number;
  taskId: number;
  comment: string;
  start: string;
  end: string;
  createdAt: string;
  updatedAt: string;
}

export type TimeEntryInput = Pick<TimeEntry, 'taskId' | 'comment' | 'start' | 'end'>;