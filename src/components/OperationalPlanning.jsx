import {
  Clock3,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Truck,
  ChefHat,
  Briefcase,
  ShoppingCart,
  RotateCw
} from "lucide-react";

import toast from "react-hot-toast";
import { API_URL } from "../config";

function getPriorityClass(priority) {
  if (priority === "urgent") return "planning-card urgent";
  if (priority === "high") return "planning-card high";
  if (priority === "low") return "planning-card low";
  return "planning-card medium";
}

function getTypeIcon(title = "") {
  const text = title.toLowerCase();

  if (text.includes("livraison")) {
    return <Truck size={18} />;
  }

  if (
    text.includes("préparation") ||
    text.includes("cuisine")
  ) {
    return <ChefHat size={18} />;
  }

  if (
    text.includes("prospection") ||
    text.includes("administratif")
  ) {
    return <Briefcase size={18} />;
  }

  if (
    text.includes("course") ||
    text.includes("stock") ||
    text.includes("réappro")
  ) {
    return <ShoppingCart size={18} />;
  }

  return <CalendarClock size={18} />;
}

export default function OperationalPlanning({
  items = [],
  refreshPlanning
}) {

  const sortedItems = [...items].sort((a, b) => {
    const timeA =
      a.planned_time || "23:59";

    const timeB =
      b.planned_time || "23:59";

    return timeA.localeCompare(timeB);
  });

  async function completeTask(id) {
    try {

      const res = await fetch(
        `${API_URL}/api/ops?action=update-planning-status`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            id,
            completed: true,
            status: "done"
          })
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Erreur"
        );
      }

      toast.success(
        "Tâche terminée"
      );

      refreshPlanning?.();

    } catch (error) {
      toast.error(
        error.message
      );
    }
  }

  async function postponeTask(
    item
  ) {
    try {

      const currentDate =
        new Date(
          item.planned_date
        );

      currentDate.setDate(
        currentDate.getDate() +
          1
      );

      const tomorrow =
        currentDate
          .toISOString()
          .slice(0, 10);

      const res = await fetch(
        `${API_URL}/api/ops?action=update-planning-status`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            id: item.id,
            planned_date:
              tomorrow
          })
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Erreur"
        );
      }

      toast.success(
        "Tâche reportée"
      );

      refreshPlanning?.();

    } catch (error) {
      toast.error(
        error.message
      );
    }
  }

  return (
    <div className="ops-layout">

      {/* TIMELINE */}
      <div className="ops-timeline">

        <div className="ops-header">

          <div>
            <p className="label">
              Planning opérationnel
            </p>

            <h2>
              Journée AgentOS
            </h2>
          </div>

          <div className="ops-badge">
            {
              sortedItems.length
            }{" "}
            actions
          </div>

        </div>

        <div className="timeline-list">

          {sortedItems.length ===
          0 ? (
            <div className="empty-planning">

              <CalendarClock
                size={42}
              />

              <h3>
                Aucun planning
              </h3>

              <p>
                L’agent IA n’a
                encore généré
                aucune action.
              </p>

            </div>
          ) : (
            sortedItems.map(
              (item) => (
                <div
                  key={item.id}
                  className={getPriorityClass(
                    item.priority
                  )}
                >

                  <div className="planning-time">

                    <Clock3 size={16} />

                    <span>
                      {item.planned_time
                        ? item.planned_time.slice(
                            0,
                            5
                          )
                        : "--:--"}
                    </span>

                  </div>

                  <div className="planning-main">

                    <div className="planning-top">

                      <div className="planning-icon">
                        {getTypeIcon(
                          item.title
                        )}
                      </div>

                      <div>

                        <h3>
                          {
                            item.title
                          }
                        </h3>

                        <p>
                          {
                            item.description
                          }
                        </p>

                      </div>

                    </div>

                    <div className="planning-footer">

                      <div className="planning-tags">

                        <span className="tag">
                          {
                            item.priority
                          }
                        </span>

                        {item.generated_by_ai && (
                          <span className="tag ai">
                            IA
                          </span>
                        )}

                        {item.completed && (
                          <span className="tag success">
                            terminé
                          </span>
                        )}

                      </div>

                      <div className="planning-actions">

                        {!item.completed && (
                          <button
                            onClick={() =>
                              completeTask(
                                item.id
                              )
                            }
                          >
                            <CheckCircle2
                              size={16}
                            />
                            Terminé
                          </button>
                        )}

                        <button
                          onClick={() =>
                            postponeTask(
                              item
                            )
                          }
                        >
                          <RotateCw
                            size={16}
                          />
                          Reporter
                        </button>

                      </div>

                    </div>

                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>

      {/* CONSEILS IA */}
      <div className="ops-ai-panel">

        <div className="ai-card">

          <div className="ai-title">
            <AlertTriangle
              size={18}
            />
            Conseils IA
          </div>

          <div className="ai-alert warning">
            ⚠️ Vérifier les
            stocks avant la
            préparation.
          </div>

          <div className="ai-alert">
            💡 Prévoir les
            commandes groupes
            avant 10h30.
          </div>

          <div className="ai-alert">
            🚚 Optimiser les
            tournées autour des
            livraisons.
          </div>

        </div>
      </div>
    </div>
  );
}