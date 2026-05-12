import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";

moment.locale("fr");

const localizer = momentLocalizer(moment);

function getEventColor(priority) {
  if (priority === "urgent") return "calendar-event urgent";
  if (priority === "high") return "calendar-event high";
  if (priority === "low") return "calendar-event low";
  return "calendar-event medium";
}

export default function PlanningCalendar({ items = [], onSelectEvent }) {
  const events = items
    .filter((item) => item.planned_date)
    .map((item) => {
      const startDate = `${item.planned_date}T${item.planned_time || "09:00"}`;
      const start = new Date(startDate);
      const end = new Date(start.getTime() + 45 * 60 * 1000);

      return {
        id: item.id,
        title: item.title,
        start,
        end,
        resource: item
      };
    });

  return (
    <div className="calendar-shell">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="fr"
        defaultView="week"
        views={["month", "week", "day", "agenda"]}
        style={{ height: 720 }}
        messages={{
          next: "Suivant",
          previous: "Précédent",
          today: "Aujourd’hui",
          month: "Mois",
          week: "Semaine",
          day: "Jour",
          agenda: "Agenda",
          date: "Date",
          time: "Heure",
          event: "Action",
          noEventsInRange: "Aucune action planifiée."
        }}
        eventPropGetter={(event) => ({
          className: getEventColor(event.resource?.priority)
        })}
        onSelectEvent={(event) => onSelectEvent?.(event.resource)}
      />
    </div>
  );
}