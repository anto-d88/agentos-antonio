export default function TaskList({
  tasks,
  full = false,
  onComplete
}) {
  if (!tasks || tasks.length === 0) {
    return (
      <p className="empty">
        Aucune tâche enregistrée.
      </p>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div
          className={
            task.completed ||
            task.status === "done"
              ? "task-card completed"
              : "task-card"
          }
          key={task.id}
        >
          <div>
            <div className="task-tags">
              <span
                className={`status ${
                  task.status || "open"
                }`}
              >
                {task.status || "open"}
              </span>

              <span
                className={`priority ${
                  task.priority || "medium"
                }`}
              >
                {task.priority || "medium"}
              </span>

              <span className="task-type">
                {task.type || "general"}
              </span>
            </div>

            <strong>
              {task.title || "Tâche sans titre"}
            </strong>

            {full && <p>{task.description}</p>}
          </div>

          <div className="task-side">
            <small>
              {task.from_agent || "Agent"} →{" "}
              {task.to_agent || "Agent"}
            </small>

            {task.status !== "done" && (
              <button
                className="done-button"
                onClick={() => onComplete(task.id)}
              >
                Terminer
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}