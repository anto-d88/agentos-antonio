import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  MessageSquare,
  Package,
  Calculator,
  Megaphone,
  ShoppingBag,
  Building2,
  Send,
  Trash2,
  LayoutDashboard,
  ListTodo,
  Database,
  History,
  AlertTriangle,
  Activity,
  Users,
  RefreshCw
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { API_URL } from "./config";
import "./App.css";

const baseRules = `
RÈGLES ABSOLUES :
- Réponds toujours en français.
- Réponds directement à la demande.
- Ne fais pas de long discours.
- N'invente jamais de prénom, d'heure, de délai, de prix ou de détail non donné.
- Si Antonio demande un SMS, donne uniquement le SMS prêt à envoyer.
- Si Antonio demande un mail, donne uniquement le mail prêt à envoyer.
- Ton professionnel, humain, simple, chaleureux et efficace.
`;

const agents = [
  {
    id: "chef",
    name: "Agent Chef d’entreprise",
    icon: Brain,
    role: "Coordonne les priorités et transforme les idées en plan d’action.",
    prompt: `${baseRules}
Tu es l’agent chef d’entreprise d’Antonio.
Tu aides à décider, prioriser, organiser et transformer les idées en actions concrètes.`
  },
  {
    id: "marque",
    name: "Agent Image de Marque",
    icon: Megaphone,
    role: "Protège le ton, l’identité et le sérieux de La Pause Sandwich.",
    prompt: `${baseRules}
Tu es l’agent image de marque de La Pause Sandwich.
Tu aides pour slogans, flyers, messages, posts, cohérence visuelle et ton de marque.`
  },
  {
    id: "client",
    name: "Agent Communication Client",
    icon: MessageSquare,
    role: "Écrit des SMS, mails et messages clients prêts à envoyer.",
    prompt: `${baseRules}
Tu es l’agent communication client de La Pause Sandwich.

RÈGLES SMS / MAIL :
- Commence toujours par une formule polie.
- Si le prénom est donné, utilise-le.
- Ne jamais inventer de prénom.
- Ne jamais inventer de délai.
- Termine toujours par : _La Pause Sandwich
- Donne uniquement le message prêt à envoyer.`
  },
  {
    id: "stock",
    name: "Agent Stock",
    icon: Package,
    role: "Prévoit les achats, quantités, ruptures et besoins cuisine.",
    prompt: `${baseRules}
Tu es l’agent stock de La Pause Sandwich.
Tu aides à prévoir les achats, les quantités et les risques de rupture.`
  },
  {
    id: "compta",
    name: "Agent Comptabilité",
    icon: Calculator,
    role: "Suit ventes, marges, dépenses et bénéfices.",
    prompt: `${baseRules}
Tu es l’agent comptabilité d’Antonio.
Tu aides à calculer ventes, dépenses, marges, bénéfices et documents à garder.`
  },
  {
    id: "commandes",
    name: "Agent Commandes",
    icon: ShoppingBag,
    role: "Organise commandes, préparation, créneaux et livraison.",
    prompt: `${baseRules}
Tu es l’agent commandes de La Pause Sandwich.
Tu aides à organiser les commandes, les créneaux, la préparation et les livraisons.`
  },
  {
    id: "commercial",
    name: "Agent Développement Commercial",
    icon: Building2,
    role: "Aide à trouver clients, call centers, entreprises et partenaires.",
    prompt: `${baseRules}
Tu es l’agent développement commercial de La Pause Sandwich.
Tu aides à écrire des messages de prospection, mails entreprises et arguments commerciaux.`
  }
];

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "agents", label: "Agents", icon: Brain },
  { id: "tasks", label: "Tâches", icon: ListTodo },
  { id: "memory", label: "Mémoire", icon: Database },
  { id: "history", label: "Historique", icon: History }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedAgent, setSelectedAgent] = useState(agents[2]);
  const [userInput, setUserInput] = useState("");
  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [memories, setMemories] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    conversationsToday: 0,
    totalConversations: 0,
    openTasks: 0,
    memories: 0,
    activeAgents: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState("open");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");

useEffect(() => {
  runAutomation(false);

  const interval = setInterval(() => {
    loadDashboard();
  }, 60000);

  const updateAlert = async (id, action) => {
  try {
    await fetch("/api/ops?action=alert-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id,
        action
      })
    });

    loadAlerts();

  } catch (err) {
    console.error(err);
  }
};

  return () => clearInterval(interval);
}, []);

  async function loadDashboard() {
    try {
      setIsRefreshing(true);

      const res = await fetch(`${API_URL}/api/dashboard`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur dashboard");
      }

      setStats(
        data.stats || {
          conversationsToday: 0,
          totalConversations: 0,
          openTasks: 0,
          memories: 0,
          activeAgents: 0
        }
      );

      setAlerts(data.alerts || []);
      setTasks(data.tasks || []);
      setMemories(data.memories || []);
      setHistory(formatConversations(data.conversations || []));
    } catch (error) {
      console.error("Erreur chargement dashboard :", error);
    } finally {
      setIsRefreshing(false);
    }
  }

async function runAutomation(showAlert = true) {
  try {
    setIsRefreshing(true);

    await fetch(`${API_URL}/api/ops?action=check-orders`);
    await fetch(`${API_URL}/api/ops?action=check-stock`);
    await fetch(`${API_URL}/api/ops?action=check-alerts`);
    await fetch(`${API_URL}/api/ops?action=auto-director`);

    await loadDashboard();

    if (showAlert) {
      alert("Synchronisation IA terminée");
    }
  } catch (error) {
    if (showAlert) {
      alert("Erreur synchronisation : " + error.message);
    }
  } finally {
    setIsRefreshing(false);
  }
}

  function formatConversations(items) {
    return items.map((item) => ({
      id: item.id,
      agent: item.agent,
      userInput: item.userInput || item.user_input,
      response: item.response,
      date:
        item.date ||
        (item.created_at
          ? new Date(item.created_at).toLocaleString("fr-FR")
          : "")
    }));
  }

  async function clearHistory() {
    try {
      await fetch(`${API_URL}/api/conversations`, {
        method: "DELETE"
      });

      await loadDashboard();
    } catch (error) {
      alert("Erreur suppression historique : " + error.message);
    }
  }

  async function completeTask(taskId) {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: taskId,
          status: "done",
          completed: true
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur mise à jour tâche");
      }

      await loadDashboard();
    } catch (error) {
      alert("Erreur tâche : " + error.message);
    }
  }

  async function handleSend() {
    if (!userInput.trim() || isLoading) return;

    const currentInput = userInput;
    const tempId = Date.now();

    setUserInput("");
    setIsLoading(true);
    setActiveTab("agents");

    const tempMessage = {
      id: tempId,
      agent: selectedAgent.name,
      userInput: currentInput,
      response: "Réflexion en cours...",
      date: new Date().toLocaleString("fr-FR")
    };

    setHistory((prev) => [tempMessage, ...prev]);

    try {
      const res = await fetch(`${API_URL}/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agentName: selectedAgent.name,
          agentPrompt: selectedAgent.prompt,
          userMessage: currentInput
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur API inconnue");
      }

      const responseText = data.response || "Pas de réponse reçue.";

      setHistory((prev) =>
        prev.map((item) =>
          item.id === tempId ? { ...item, response: responseText } : item
        )
      );

      await loadDashboard();
    } catch (error) {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                response: "ERREUR : " + error.message
              }
            : item
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSend();
    }
  }

  const chartData = useMemo(() => {
    const grouped = {};

    history.forEach((item) => {
      const day = item.date ? item.date.slice(0, 10) : "Aujourd’hui";
      grouped[day] = (grouped[day] || 0) + 1;
    });

    return Object.entries(grouped)
      .slice(0, 7)
      .reverse()
      .map(([day, count]) => ({
        day,
        conversations: count
      }));
  }, [history]);

  const agentActivity = useMemo(() => {
    const grouped = {};

    history.forEach((item) => {
      grouped[item.agent] = (grouped[item.agent] || 0) + 1;
    });

    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [history]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const statusMatch =
        taskStatusFilter === "all" ||
        task.status === taskStatusFilter ||
        (taskStatusFilter === "open" &&
          !task.completed &&
          task.status !== "done") ||
        (taskStatusFilter === "done" &&
          (task.completed || task.status === "done"));

      const priorityMatch =
        taskPriorityFilter === "all" || task.priority === taskPriorityFilter;

      return statusMatch && priorityMatch;
    });
  }, [tasks, taskStatusFilter, taskPriorityFilter]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1>AgentOS</h1>
          <p>Centre de contrôle IA</p>
        </div>

        <nav className="tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "tab active" : "tab"}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={19} />
                {tab.label}
              </button>
            );
          })}
        </nav>

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

      <main className="main">
        {activeTab === "dashboard" && (
          <>
            <Header
              title="Dashboard entreprise"
              subtitle="Vue centrale de ton système d’agents IA"
            />

            <section className="kpi-grid">
              <KpiCard
                title="Conversations aujourd’hui"
                value={stats.conversationsToday}
                icon={Activity}
              />
              <KpiCard
                title="Tâches ouvertes"
                value={stats.openTasks}
                icon={ListTodo}
              />
              <KpiCard title="Mémoires" value={stats.memories} icon={Database} />
              <KpiCard
                title="Agents actifs"
                value={stats.activeAgents}
                icon={Users}
              />
            </section>

            <section className="dashboard-grid">
              <div className="panel large">
                <div className="panel-header">
                  <h3>Activité récente</h3>
                  <span>{history.length} échanges</span>
                </div>

                <div className="chart-box">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
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
                    <p className="empty">Pas encore assez de données.</p>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Alertes</h3>
                  <AlertTriangle size={20} />
                </div>

                {alerts.length === 0 ? (
                  <p className="empty">Aucune alerte pour le moment.</p>
                ) : (
                  <div className="alert-list">
                    {alerts.map((alert, index) => (
                      <div className="alert-card" key={index}>
                        <strong>{alert.title}</strong>
                        <p>{alert.message}</p>
                        <div className="flex gap-2 mt-3 flex-wrap">

  <button
    onClick={() => updateAlert(alert.id, "read")}
    className="bg-blue-500 text-white px-2 py-1 rounded"
  >
    ✓ Lu
  </button>

  <button
    onClick={() => updateAlert(alert.id, "important")}
    className="bg-yellow-500 text-black px-2 py-1 rounded"
  >
    ⭐ Important
  </button>

  <button
    onClick={() => openPlanningModal(alert)}
    className="bg-purple-500 text-white px-2 py-1 rounded"
  >
    📅 Planning
  </button>

  <button
    onClick={() => updateAlert(alert.id, "complete")}
    className="bg-green-600 text-white px-2 py-1 rounded"
  >
    ✅ Terminé
  </button>

  <button
    onClick={() => updateAlert(alert.id, "delete")}
    className="bg-red-600 text-white px-2 py-1 rounded"
  >
    🗑 Supprimer
  </button>

</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Agents les plus actifs</h3>
                </div>

                {agentActivity.length === 0 ? (
                  <p className="empty">Aucune activité agent.</p>
                ) : (
                  <div className="agent-activity">
                    {agentActivity.map(([agent, count]) => (
                      <div className="activity-row" key={agent}>
                        <span>{agent}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Dernières tâches</h3>
                </div>

                <TaskList tasks={tasks.slice(0, 5)} onComplete={completeTask} />
              </div>
            </section>
          </>
        )}

        {activeTab === "agents" && (
          <>
            <Header
              title="Agents IA"
              subtitle="Sélectionne un agent et donne-lui une mission"
            />

            <section className="agents-layout">
              <div className="agent-selector">
                {agents.map((agent) => {
                  const Icon = agent.icon;

                  return (
                    <button
                      key={agent.id}
                      className={
                        selectedAgent.id === agent.id
                          ? "agent-card active"
                          : "agent-card"
                      }
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <Icon size={22} />
                      <div>
                        <strong>{agent.name}</strong>
                        <p>{agent.role}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="agent-workspace">
                <div className="hero-card">
                  <p className="label">Agent sélectionné</p>
                  <h2>{selectedAgent.name}</h2>
                  <p>{selectedAgent.role}</p>
                </div>

                <div className="panel">
                  <h3>Nouvelle mission</h3>

                  <textarea
                    placeholder="Écris ta demande ici..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />

                  <div className="actions">
                    <button onClick={handleSend} disabled={isLoading}>
                      <Send size={18} />
                      {isLoading ? "Réflexion..." : "Envoyer"}
                    </button>

                    <span>Ctrl + Entrée pour envoyer</span>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3>Dernière réponse</h3>
                  </div>

                  {history.length === 0 ? (
                    <p className="empty">Aucune réponse pour le moment.</p>
                  ) : (
                    <ConversationCard item={history[0]} />
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "tasks" && (
          <>
            <Header
              title="Tâches inter-agents"
              subtitle="Actions générées par les agents"
            />

            <section className="task-filters">
              <button
                className={
                  taskStatusFilter === "open" ? "filter active" : "filter"
                }
                onClick={() => setTaskStatusFilter("open")}
              >
                Ouvertes
              </button>

              <button
                className={
                  taskStatusFilter === "done" ? "filter active" : "filter"
                }
                onClick={() => setTaskStatusFilter("done")}
              >
                Terminées
              </button>

              <button
                className={
                  taskStatusFilter === "all" ? "filter active" : "filter"
                }
                onClick={() => setTaskStatusFilter("all")}
              >
                Toutes
              </button>

              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
              >
                <option value="all">Toutes priorités</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </section>

            <section className="panel">
              <TaskList tasks={filteredTasks} full onComplete={completeTask} />
            </section>
          </>
        )}

        {activeTab === "memory" && (
          <>
            <Header
              title="Mémoire long terme"
              subtitle="Règles, préférences et informations importantes"
            />

            <section className="memory-grid">
              {memories.length === 0 ? (
                <p className="empty">Aucune mémoire enregistrée.</p>
              ) : (
                memories.map((memory) => (
                  <div className="memory-card" key={memory.id}>
                    <span>{memory.category || "Général"}</span>
                    <p>{memory.content}</p>
                    <small>
                      {memory.created_at
                        ? new Date(memory.created_at).toLocaleString("fr-FR")
                        : ""}
                    </small>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {activeTab === "history" && (
          <>
            <Header
              title="Historique"
              subtitle="Toutes les conversations enregistrées"
            />

            <div className="history-actions">
              <button onClick={clearHistory} className="delete-button">
                <Trash2 size={18} />
                Effacer historique
              </button>
            </div>

            <section className="history-list">
              {history.length === 0 ? (
                <p className="empty">Aucune conversation enregistrée.</p>
              ) : (
                history.map((item) => (
                  <ConversationCard item={item} key={item.id} />
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Header({ title, subtitle }) {
  return (
    <header className="page-header">
      <div>
        <p className="label">AgentOS</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function KpiCard({ title, value, icon: Icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">
        <Icon size={24} />
      </div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TaskList({ tasks, full = false, onComplete }) {
  if (!tasks || tasks.length === 0) {
    return <p className="empty">Aucune tâche enregistrée.</p>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div
          className={
            task.completed || task.status === "done"
              ? "task-card completed"
              : "task-card"
          }
          key={task.id}
        >
          <div>
            <div className="task-tags">
              <span className={`status ${task.status || "open"}`}>
                {task.status || "open"}
              </span>

              <span className={`priority ${task.priority || "medium"}`}>
                {task.priority || "medium"}
              </span>

              <span className="task-type">{task.type || "general"}</span>
            </div>

            <strong>{task.title || "Tâche sans titre"}</strong>

            {full && <p>{task.description}</p>}
          </div>

          <div className="task-side">
            <small>
              {task.from_agent || "Agent"} → {task.to_agent || "Agent"}
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

function ConversationCard({ item }) {
  return (
    <div className="conversation-card">
      <div className="conversation-header">
        <strong>{item.agent}</strong>
        <small>{item.date}</small>
      </div>

      <div className="message-block">
        <span>Demande</span>
        <p>{item.userInput}</p>
      </div>

      <div className="response-block">
        <span>Réponse</span>
        <p>{item.response}</p>
      </div>
    </div>
  );
}