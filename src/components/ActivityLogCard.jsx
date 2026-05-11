import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  Clock3
} from "lucide-react";

export default function ActivityLogCard({
  log
}) {
  function getStatusIcon() {
    if (log.status === "success") {
      return <CheckCircle2 size={18} />;
    }

    if (log.status === "warning") {
      return <AlertTriangle size={18} />;
    }

    return <Clock3 size={18} />;
  }

  return (
    <div className="log-card">
      <div className="log-left">
        <div className="log-icon">
          <Brain size={18} />
        </div>

        <div className="log-content">
          <div className="log-top">
            <strong>
              {log.title || "Action IA"}
            </strong>

            <span
              className={`priority ${
                log.priority || "medium"
              }`}
            >
              {log.priority || "medium"}
            </span>
          </div>

          <p>
            {log.description ||
              "Aucune description"}
          </p>

          <small>
            {log.agent_name || "Agent IA"} •{" "}
            {new Date(
              log.created_at
            ).toLocaleString("fr-FR")}
          </small>
        </div>
      </div>

      <div
        className={`log-status ${
          log.status || "success"
        }`}
      >
        {getStatusIcon()}
      </div>
    </div>
  );
}