import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
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
  Plus,
  X
} from "lucide-react";

import { API_URL } from "./config";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Topbar from "./components/Topbar";
import TaskList from "./components/TaskList";
import ConversationCard from "./components/ConversationCard";
import AlertCard from "./components/AlertCard";
import PlanningList from "./components/PlanningList";

import DashboardPage from "./pages/DashboardPage";
import LogsPage from "./pages/LogsPage";

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

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedAgent, setSelectedAgent] = useState(agents[2]);
  const [userInput, setUserInput] = useState("");

  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [memories, setMemories] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [planning, setPlanning] = useState([]);
  const [logs, setLogs] = useState([]);

  const [stats, setStats] = useState({
    conversationsToday: 0,
    totalConversations: 0,
    openTasks: 0,
    memories: 0,
    activeAgents: 0,
    unreadAlerts: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [taskStatusFilter, setTaskStatusFilter] = useState("open");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("all");
  const [inboxFilter, setInboxFilter] = useState("unread");

  const [planningModalOpen, setPlanningModalOpen] = useState(false);
  const [planningSourceAlert, setPlanningSourceAlert] = useState(null);
  const [planningForm, setPlanningForm] = useState({
    title: "",
    description: "",
    planned_date: "",
    planned_time: "",
    priority: "medium"
  });

  const [knownAlertIds, setKnownAlertIds] = useState([]);
  const [alertsInitialized, setAlertsInitialized] = useState(false);

  useEffect(() => {
    runAutomation(false);

    const interval = setInterval(async () => {
      try {
        await loadDashboard();
        await loadPlanning();

        await fetch(`${API_URL}/api/ops?action=check-new-orders`);
        await fetch(`${API_URL}/api/ops?action=check-stock`);
        await fetch(`${API_URL}/api/ops?action=check-orders`);
      } catch (error) {
        console.error("Erreur polling temps réel :", error);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!alerts.length) return;

    if (!alertsInitialized) {
      setKnownAlertIds(alerts.map((alert) => alert.id));
      setAlertsInitialized(true);
      return;
    }

    const newAlerts = alerts.filter(
      (alert) => !knownAlertIds.includes(alert.id) && !alert.read
    );

    const latestAlerts = newAlerts.slice(0, 10);

    latestAlerts.forEach((alert) => {
      toast(`🚨 ${alert.title}\n${alert.message}`);
    });

    setKnownAlertIds(alerts.map((alert) => alert.id));
  }, [alerts, alertsInitialized, knownAlertIds]);

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
          activeAgents: 0,
          unreadAlerts: 0
        }
      );

      setAlerts(data.alerts || []);
      setTasks(data.tasks || []);
      setMemories(data.memories || []);
      setLogs(data.logs || []);
      setHistory(formatConversations(data.conversations || []));
    } catch (error) {
      console.error("Erreur chargement dashboard :", error);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadPlanning() {
    try {
      const res = await fetch(`${API_URL}/api/ops?action=get-planning`);
      const data = await res.json();

      if (res.ok) {
        setPlanning(data.planning || []);
      }
    } catch (error) {
      console.error("Erreur chargement planning :", error);
    }
  }

  async function runAutomation(showAlert = true) {
    try {
      setIsRefreshing(true);

      await fetch(`${API_URL}/api/ops?action=check-new-orders`);
      await fetch(`${API_URL}/api/ops?action=check-stock`);
      await fetch(`${API_URL}/api/ops?action=check-orders`);
      await fetch(`${API_URL}/api/ops?action=auto-director`);

      await loadDashboard();
      await loadPlanning();

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

  async function updateAlert(id, action) {
    try {
      const res = await fetch(`${API_URL}/api/ops?action=alert-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id,
          action
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur mise à jour alerte");
      }

      await loadDashboard();
    } catch (error) {
      alert("Erreur alerte : " + error.message);
    }
  }

  function openPlanningModal(alert) {
    const today = new Date().toISOString().slice(0, 10);

    setPlanningSourceAlert(alert);
    setPlanningForm({
      title: alert.title || "Action à planifier",
      description: alert.message || "",
      planned_date: today,
      planned_time: "",
      priority: alert.priority || "medium"
    });
    setPlanningModalOpen(true);
  }

  function closePlanningModal() {
    setPlanningModalOpen(false);
    setPlanningSourceAlert(null);
  }

  async function submitPlanning(e) {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/api/ops?action=add-to-planning`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...planningForm,
          source_type: planningSourceAlert ? "alert" : "manual",
          source_id: planningSourceAlert?.id || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur planning");
      }

      closePlanningModal();
      await loadDashboard();
      await loadPlanning();
      setActiveTab("planning");
    } catch (error) {
      alert("Erreur ajout planning : " + error.message);
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

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (inboxFilter === "all") return !alert.deleted;
      if (inboxFilter === "unread") return !alert.read && !alert.deleted;
      if (inboxFilter === "important") return alert.important && !alert.deleted;
      if (inboxFilter === "planned") return alert.planned && !alert.deleted;
      if (inboxFilter === "completed") return alert.completed && !alert.deleted;
      if (inboxFilter === "deleted") return alert.deleted;
      return true;
    });
  }, [alerts, inboxFilter]);

  const planningToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return planning.filter((item) => item.planned_date === today);
  }, [planning]);

  return (
    <div className="app">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        runAutomation={runAutomation}
        isRefreshing={isRefreshing}
      />

      <main className="main">
        <Topbar alerts={alerts} />

        {activeTab === "dashboard" && (
          <DashboardPage
            stats={stats}
            history={history}
            alerts={alerts}
            planningToday={planningToday}
            chartData={chartData}
            agentActivity={agentActivity}
            updateAlert={updateAlert}
            openPlanningModal={openPlanningModal}
          />
        )}

        {activeTab === "inbox" && (
          <>
            <Header
              title="Inbox IA"
              subtitle="Toutes les alertes importantes comme une boîte mail : lu, important, terminé, supprimé ou ajouté au planning."
            />

            <section className="task-filters">
              {[
                ["unread", "Non lus"],
                ["important", "Importants"],
                ["planned", "Planifiés"],
                ["completed", "Terminés"],
                ["deleted", "Supprimés"],
                ["all", "Tous"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={inboxFilter === value ? "filter active" : "filter"}
                  onClick={() => setInboxFilter(value)}
                >
                  {label}
                </button>
              ))}
            </section>

            <section className="inbox-list">
              {filteredAlerts.length === 0 ? (
                <div className="panel">
                  <p className="empty">Aucune alerte dans cette catégorie.</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onUpdate={updateAlert}
                    onPlan={openPlanningModal}
                  />
                ))
              )}
            </section>
          </>
        )}

        {activeTab === "planning" && (
          <>
            <Header
              title="Planning opérationnel"
              subtitle="Les actions planifiées depuis les alertes, agents et décisions importantes."
            />

            <section className="planning-toolbar">
              <button
                className="refresh-button"
                onClick={() => {
                  setPlanningSourceAlert(null);
                  setPlanningForm({
                    title: "",
                    description: "",
                    planned_date: new Date().toISOString().slice(0, 10),
                    planned_time: "",
                    priority: "medium"
                  });
                  setPlanningModalOpen(true);
                }}
              >
                <Plus size={18} />
                Ajouter au planning
              </button>
            </section>

            <section className="planning-grid">
              <PlanningList items={planning} />
            </section>
          </>
        )}

        {activeTab === "agents" && (
          <>
            <Header
              title="Agents IA"
              subtitle="Sélectionne un agent et donne-lui une mission."
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
              subtitle="Actions générées automatiquement par les agents."
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

        {activeTab === "logs" && <LogsPage logs={logs} />}

        {activeTab === "memory" && (
          <>
            <Header
              title="Mémoire long terme"
              subtitle="Règles, préférences et informations importantes."
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
              subtitle="Toutes les conversations enregistrées."
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

      {planningModalOpen && (
        <div className="modal-backdrop">
          <form className="planning-modal" onSubmit={submitPlanning}>
            <div className="modal-header">
              <div>
                <p className="label">Planning</p>
                <h3>Ajouter une action</h3>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closePlanningModal}
              >
                <X size={20} />
              </button>
            </div>

            <label>
              Titre
              <input
                value={planningForm.title}
                onChange={(e) =>
                  setPlanningForm((prev) => ({
                    ...prev,
                    title: e.target.value
                  }))
                }
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={planningForm.description}
                onChange={(e) =>
                  setPlanningForm((prev) => ({
                    ...prev,
                    description: e.target.value
                  }))
                }
              />
            </label>

            <div className="form-row">
              <label>
                Date
                <input
                  type="date"
                  value={planningForm.planned_date}
                  onChange={(e) =>
                    setPlanningForm((prev) => ({
                      ...prev,
                      planned_date: e.target.value
                    }))
                  }
                  required
                />
              </label>

              <label>
                Heure
                <input
                  type="time"
                  value={planningForm.planned_time || ""}
                  onChange={(e) =>
                    setPlanningForm((prev) => ({
                      ...prev,
                      planned_time: e.target.value
                    }))
                  }
                />
              </label>
            </div>

            <label>
              Priorité
              <select
                value={planningForm.priority}
                onChange={(e) =>
                  setPlanningForm((prev) => ({
                    ...prev,
                    priority: e.target.value
                  }))
                }
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="delete-button"
                onClick={closePlanningModal}
              >
                Annuler
              </button>

              <button type="submit" className="refresh-button">
                Ajouter au planning
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}