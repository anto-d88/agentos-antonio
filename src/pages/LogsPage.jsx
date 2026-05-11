import Header from "../components/Header";
import ActivityLogCard from "../components/ActivityLogCard";

export default function LogsPage({
  logs
}) {
  return (
    <>
      <Header
        title="Logs IA"
        subtitle="Journal temps réel des actions et événements AgentOS."
      />

      <section className="logs-list">
        {!logs || logs.length === 0 ? (
          <div className="panel">
            <p className="empty">
              Aucun log enregistré.
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <ActivityLogCard
              key={log.id}
              log={log}
            />
          ))
        )}
      </section>
    </>
  );
}