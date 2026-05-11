export default function PlanningList({
  items,
  compact = false
}) {
  if (!items || items.length === 0) {
    return (
      <p className="empty">
        Aucune action planifiée.
      </p>
    );
  }

  return (
    <div className="planning-list">
      {items.map((item) => (
        <div
          className="planning-card"
          key={item.id}
        >
          <div>
            <span
              className={`priority ${
                item.priority || "medium"
              }`}
            >
              {item.priority || "medium"}
            </span>

            <strong>{item.title}</strong>

            {!compact && (
              <p>{item.description}</p>
            )}
          </div>

          <small>
            {item.planned_date}

            {item.planned_time
              ? ` · ${item.planned_time}`
              : ""}
          </small>
        </div>
      ))}
    </div>
  );
}