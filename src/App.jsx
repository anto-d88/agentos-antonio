import { useEffect, useState } from "react";
import {
  Brain,
  MessageSquare,
  Package,
  Calculator,
  Megaphone,
  ShoppingBag,
  Building2,
  Send,
  Trash2
} from "lucide-react";
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
Tu es l’agent chef d’entreprise d’Antonio.`
  },
  {
    id: "marque",
    name: "Agent Image de Marque",
    icon: Megaphone,
    role: "Protège le ton, l’identité et le sérieux de La Pause Sandwich.",
    prompt: `${baseRules}
Tu es l’agent image de marque de La Pause Sandwich.`
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
    role: "Prévoit les achats et les besoins cuisine.",
    prompt: `${baseRules}
Tu es l’agent stock de La Pause Sandwich.`
  },
  {
    id: "compta",
    name: "Agent Comptabilité",
    icon: Calculator,
    role: "Suit ventes, marges, dépenses et bénéfices.",
    prompt: `${baseRules}
Tu es l’agent comptabilité d’Antonio.`
  },
  {
    id: "commandes",
    name: "Agent Commandes",
    icon: ShoppingBag,
    role: "Organise commandes, préparation et livraison.",
    prompt: `${baseRules}
Tu es l’agent commandes de La Pause Sandwich.`
  },
  {
    id: "commercial",
    name: "Agent Développement Commercial",
    icon: Building2,
    role: "Aide à trouver clients et partenaires.",
    prompt: `${baseRules}
Tu es l’agent développement commercial de La Pause Sandwich.`
  }
];

export default function App() {
  const [selectedAgent, setSelectedAgent] = useState(agents[2]);
  const [userInput, setUserInput] = useState("");
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const res = await fetch(`${API_URL}/api/conversations`);
      const data = await res.json();

      const formatted = data.map((item) => ({
        id: item.id,
        agent: item.agent,
        userInput: item.userInput || item.user_input,
        response: item.response,
        date:
          item.date ||
          new Date(item.created_at).toLocaleString("fr-FR")
      }));

      setHistory(formatted);
    } catch (error) {
      console.error("Erreur chargement :", error);
    }
  }

  async function clearHistory() {
    try {
      await fetch(`${API_URL}/api/conversations`, {
        method: "DELETE"
      });

      setHistory([]);
    } catch (error) {
      alert("Erreur suppression historique : " + error.message);
    }
  }

  async function handleSend() {
    if (!userInput.trim() || isLoading) return;

    const currentInput = userInput;
    const tempId = Date.now();

    setUserInput("");
    setIsLoading(true);

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
          item.id === tempId
            ? {
                ...item,
                response: responseText
              }
            : item
        )
      );

      await loadConversations();
    } catch (error) {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                response:
                  "ERREUR : " +
                  error.message +
                  "\n\nVérifie /api/agent dans Vercel Logs."
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

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <h1>AgentOS</h1>
          <p className="subtitle">Centre de contrôle IA</p>
        </div>

        <div className="agent-list">
          {agents.map((agent) => {
            const Icon = agent.icon;

            return (
              <button
                key={agent.id}
                className={
                  selectedAgent.id === agent.id ? "agent active" : "agent"
                }
                onClick={() => setSelectedAgent(agent)}
              >
                <Icon size={20} />
                <span>{agent.name}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="main">
        <section className="hero">
          <div>
            <p className="label">Agent sélectionné</p>
            <h2>{selectedAgent.name}</h2>
            <p>{selectedAgent.role}</p>
          </div>
        </section>

        <section className="panel">
          <h3>Mission</h3>
          <p>{selectedAgent.role}</p>
        </section>

        <section className="chatbox">
          <h3>Nouvelle mission</h3>

          <textarea
            placeholder="Écris ta demande..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="actions">
            <button onClick={handleSend} disabled={isLoading}>
              <Send size={18} />
              {isLoading ? "Réflexion..." : "Envoyer"}
            </button>

            <button onClick={clearHistory} className="delete-button">
              <Trash2 size={18} />
              Effacer historique
            </button>
          </div>
        </section>

        <section className="history">
          <h3>Historique</h3>

          {history.length === 0 && (
            <p className="empty">Aucune conversation enregistrée.</p>
          )}

          {history.map((item) => (
            <div className="history-card" key={item.id}>
              <div className="history-header">
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
          ))}
        </section>
      </main>
    </div>
  );
}