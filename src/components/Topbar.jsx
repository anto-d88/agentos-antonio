import {
  Bell,
  Search,
  Clock3,
  Wifi
} from "lucide-react";

export default function Topbar({
  alerts
}) {
  const now = new Date();

  const time = now.toLocaleTimeString(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );

  const unreadAlerts = alerts.filter(
    (a) => !a.read && !a.deleted
  ).length;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="search-box">
          <Search size={17} />

          <input
            placeholder="Rechercher..."
          />
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-status">
          <Wifi size={15} />

          <span>Live sync active</span>
        </div>

        <div className="topbar-time">
          <Clock3 size={15} />

          <span>{time}</span>
        </div>

        <div className="topbar-bell">
          <Bell size={18} />

          {unreadAlerts > 0 && (
            <div className="bell-badge">
              {unreadAlerts}
            </div>
          )}
        </div>

        <div className="topbar-user">
          <div className="avatar">
            AR
          </div>

          <div>
            <strong>Antonio</strong>

            <span>Founder</span>
          </div>
        </div>
      </div>
    </header>
  );
}