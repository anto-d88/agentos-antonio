import {
  Eye,
  Star,
  CalendarDays,
  CheckCircle2,
  Archive
} from "lucide-react";

export default function AlertCard({
  alert,
  onUpdate,
  onPlan,
  compact = false
}) {
  return (
    <div
      className={`alert-card ${
        alert.important ? "important" : ""
      }`}
    >
      <div className="inbox-card-header">
        <div>
          <strong>{alert.title || "Alerte"}</strong>

          <p>{alert.message}</p>
        </div>

        <span
          className={`priority ${
            alert.priority || "medium"
          }`}
        >
          {alert.priority || "medium"}
        </span>
      </div>

      {!compact && (
        <div className="inbox-actions">
          <button
            onClick={() => onUpdate(alert.id, "read")}
          >
            <Eye size={15} />
            Lu
          </button>

          <button
            onClick={() =>
              onUpdate(alert.id, "important")
            }
          >
            <Star size={15} />
            Important
          </button>

          <button onClick={() => onPlan(alert)}>
            <CalendarDays size={15} />
            Planning
          </button>

          <button
            onClick={() =>
              onUpdate(alert.id, "complete")
            }
          >
            <CheckCircle2 size={15} />
            Terminé
          </button>

          <button
            onClick={() =>
              onUpdate(alert.id, "delete")
            }
          >
            <Archive size={15} />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}