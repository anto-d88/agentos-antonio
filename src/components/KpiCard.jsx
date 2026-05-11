export default function KpiCard({ title, value, icon: Icon }) {
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