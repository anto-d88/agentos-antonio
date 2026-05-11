export default function Header({ title, subtitle, eyebrow = "AgentOS" }) {
  return (
    <header className="page-header">
      <div>
        <p className="label">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}