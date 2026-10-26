import { flattenTasks } from './tree-utils';
import { Task } from '../../../core/models/task.model';

describe('flattenTasks', () => {
  const task = (id: number, parent: number): Task => ({ id, parent, name: 'Task ' + id, status: 'active' });

  it('puts sub-tasks right after their parent, one level deeper', () => {
    const rows = flattenTasks([task(1, 0), task(2, 0), task(3, 1)]);
    expect(rows.map(r => [r.task.id, r.depth])).toEqual([[1, 0], [3, 1], [2, 0]]);
  });

  it('treats a task whose parent is not in the list as top level', () => {
    expect(flattenTasks([task(5, 99)]).map(r => r.depth)).toEqual([0]);
  });
});
