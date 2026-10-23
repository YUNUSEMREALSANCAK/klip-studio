import { tr, trMessage } from '../i18n';
import { useEditor } from '../core/store';

export function TaskToasts() {
  const tasks = useEditor((s) => s.tasks);
  if (!tasks.length) return null;
  return (
    <div className="tasks">
      {tasks.map((task) => (
        <div key={task.id} className={`task ${task.error ? 'error' : ''}`}>
          <div className="task-title">{tr(task.label)}</div>
          <div className="task-msg">{trMessage(task.error ?? task.message ?? 'Hazırlanıyor…')}</div>
          {!task.error && (
            <div className={`progress ${task.progress < 0 ? 'indeterminate' : ''}`}>
              <div style={{ width: `${Math.max(task.progress, 0) * 100}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
