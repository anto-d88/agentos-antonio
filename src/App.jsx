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

import "./App.css";

const baseRules = `
RÈGLES ABSOLUES :
- Réponds toujours en français.
- Réponds directement à la demande.
- Ne fais pas de long discours.
- Ne donne pas d'explication inutile après le résultat.
- N'invente jamais de prénom, d'heure, de durée, de prix ou de détail non donné.
- Si Antonio demande un SMS, donne uniquement le SMS prêt à envoyer.
- Si Antonio demande un mail, donne uniquement le mail prêt à envoyer.
- Style : professionnel, humain, simple, chaleureux, efficace.
`;

const agents = [
  {
    id: "chef",
    name: "Agent Chef d’entreprise",
    icon: Brain,
    role: "Coordonne les priorités et transforme les idées en plan d’action.",
    prompt: `${baseRules}
Tu es l’agent chef d’entreprise d’Antonio.
Tu aides à organiser les projets et prendre les bonnes décisions.`
  },
  {
    id: "marque",
    name: "Agent Image de Marque",
    icon: Megaphone,
    role: "Protège le ton, l’identité et le sérieux de La Pause Sandwich.",
    prompt: `${baseRules}
Tu es l’agent image de marque de La Pause Sandwich.
Tu aides pour slogans, flyers, communication et cohérence de marque.`
  },
  {
    id: "client",
    name: "Agent Communication Client",
    icon: MessageSquare,
    role: "Écrit des SMS, mails et messages clients prêts à envoyer.",
    prompt: `${baseRules}
Tu es l’agent communication client de La Pause Sandwich.

RÈGLES :
- Commence toujours poliment.
- Ne jamais inventer de prénom.
- Termine toujours par : _La Pause Sandwich
- SMS court et professionnel.
- Pas d’explication après le message.`
  },
  {
    id: "stock",
    name: "Agent Stock",
    icon: Package,
    role: "Prévoit les achats et les besoins cuisine.",
    prompt: `${baseRules}
Tu es l’agent stock de La Pause Sandwich.
Tu aides à prévoir achats, quantités et ruptures.`
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
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);
  const [userInput, setUserInput] = useState("");
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const res = await fetch("http://localhost:3001/api/conversations");
      const data = await res.json();

      setHistory(data);
    } catch (error) {
      console.error("Erreur chargement conversations :", error);
    }
  }

  async function clearHistory() {
    try {
      await fetch("http://localhost:3001/api/conversations", {
        method: "DELETE"
      });

      setHistory([]);
    } catch (error) {
      console.error("Erreur suppression historique :", error);
    }
  }

  async function handleSend() {
    if (!userInput.trim() || isLoading) return;

    const currentInput = userInput;

    setUserInput("");
    setIsLoading(true);

    const tempMessage = {
      id: Date.now(),
      agent: selectedAgent.name,
      userInput: currentInput,
      response: "Réflexion en cours...",
      date: new Date().toLocaleString()
    };

    setHistory((prev) => [tempMessage, ...prev]);

    try {
      const res = await fetch("http://localhost:3001/api/agent", {
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

      await loadConversations();
    } catch (error) {
      console.error(error);
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

            <button
              onClick={clearHistory}
              className="delete-button"
            >
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