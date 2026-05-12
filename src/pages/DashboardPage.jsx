import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Users
} from "lucide-react";

import Header from "../components/Header";
import KpiCard from "../components/KpiCard";
import AlertCard from "../components/AlertCard";
import PlanningList from "../components/PlanningList";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

export default function DashboardPage({
  stats,
  history,
  alerts,
  planningToday,
  chartData,
  agentActivity,
  updateAlert,
  openPlanningModal
}) {
  return (
    <>
      <Header
        title="Cockpit opérationnel"
        subtitle="Vue centrale des agents IA, alertes, tâches et automatisations."
      />

      <motion.section
  className="kpi-grid"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.45 }}
>
        <KpiCard
          title="Conversations aujourd’hui"
          value={stats.conversationsToday}
          icon={Activity}
        />

        <KpiCard
          title="Tâches ouvertes"
          value={stats.openTasks}
          icon={AlertTriangle}
        />

        <KpiCard
          title="Alertes non lues"
          value={
            stats.unreadAlerts ||
            alerts.filter((a) => !a.read).length
          }
          icon={Users}
        />

        <KpiCard
          title="Agents actifs"
          value={stats.activeAgents}
          icon={Users}
        />
      </motion.section>

      <motion.section
  className="dashboard-grid"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{
    duration: 0.5,
    delay: 0.15
  }}
>
        <div className="panel large">
          <div className="panel-header">
            <h3>Activité IA récente</h3>

            <span>{history.length} échanges</span>
          </div>

          <div className="chart-box">
            {chartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={260}
              >
                <LineChart data={chartData}>
                  <XAxis dataKey="day" />

                  <YAxis allowDecimals={false} />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="conversations"
                    strokeWidth={3}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty">
                Pas encore assez de données.
              </p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Inbox urgente</h3>

            <AlertTriangle size={20} />
          </div>

          {alerts.length === 0 ? (
            <p className="empty">
              Aucune alerte.
            </p>
          ) : (
            <div className="alert-list">
              {alerts.slice(0, 5).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onUpdate={updateAlert}
                  onPlan={openPlanningModal}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Agents les plus actifs</h3>
          </div>

          {agentActivity.length === 0 ? (
            <p className="empty">
              Aucune activité agent.
            </p>
          ) : (
            <div className="agent-activity">
              {agentActivity.map(
                ([agent, count]) => (
                  <div
                    className="activity-row"
                    key={agent}
                  >
                    <span>{agent}</span>

                    <strong>{count}</strong>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Planning du jour</h3>

            <CalendarDays size={20} />
          </div>

          <PlanningList
            items={planningToday.slice(0, 5)}
            compact
          />
        </div>
      </motion.section>
    </>
  );
}