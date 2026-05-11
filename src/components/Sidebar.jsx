import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  Brain,
  ListTodo,
  Database,
  History,
  RefreshCw,
  Activity
} from "lucide-react";

const tabs = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  },
  {
    id: "inbox",
    label: "Inbox IA",
    icon: Inbox
  },
  {
    id: "planning",
    label: "Planning",
    icon: CalendarDays
  },
  {
    id: "agents",
    label: "Agents",
    icon: Brain
  },
  {
  id: "logs",
  label: "Logs IA",
  icon: Activity
  },
  {
    id: "tasks",
    label: "Tâches",
    icon: ListTodo
  },
  {
    id: "memory",
    label: "Mémoire",
    icon: Database
  },
  {
    id: "history",
    label: "Historique",
    icon: History
  }
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  stats,
  runAutomation,
  isRefreshing
}) {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brand-top">
            <div className="brand-logo">
              <Brain size={24} />
            </div>

            <div>
              <h1>AgentOS</h1>
              <p>Cockpit IA opérationnel</p>
            </div>
          </div>

          <div className="system-status">
            <div className="status-dot"></div>
            <span>Système opérationnel</span>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Navigation</span>

          <nav className="tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  className={
                    activeTab === tab.id ? "tab active" : "tab"
                  }
                  onClick={() => setActiveTab(tab.id)}
                >
                  <div className="tab-left">
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </div>

                  {tab.id === "inbox" &&
                    stats?.unreadAlerts > 0 && (
                      <div className="tab-badge">
                        {stats.unreadAlerts}
                      </div>
                    )}

                  {tab.id === "tasks" &&
                    stats?.openTasks > 0 && (
                      <div className="tab-badge warning">
                        {stats.openTasks}
                      </div>
                    )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Système IA</span>

          <div className="sidebar-stats">
            <div className="mini-stat">
              <div className="mini-stat-icon">
                <Activity size={16} />
              </div>

              <div>
                <strong>{stats?.activeAgents || 0}</strong>
                <span>Agents actifs</span>
              </div>
            </div>

            <div className="mini-stat">
              <div className="mini-stat-icon yellow">
                <Inbox size={16} />
              </div>

              <div>
                <strong>{stats?.unreadAlerts || 0}</strong>
                <span>Alertes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <button
          onClick={() => runAutomation(true)}
          className="refresh-button"
        >
          <RefreshCw
            size={17}
            className={isRefreshing ? "spin" : ""}
          />

          Synchroniser IA
        </button>
      </div>
    </aside>
  );
}