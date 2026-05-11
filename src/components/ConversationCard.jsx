export default function ConversationCard({
  item
}) {
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