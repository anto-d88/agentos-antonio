import moment from "moment";
import "moment/locale/fr";

import {
  Calendar,
  momentLocalizer
} from "react-big-calendar";

import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

moment.locale("fr");

const localizer = momentLocalizer(moment);

const DnDCalendar =
  withDragAndDrop(Calendar);

function getEventColor(priority) {
  if (priority === "urgent")
    return "calendar-event urgent";

  if (priority === "high")
    return "calendar-event high";

  if (priority === "low")
    return "calendar-event low";

  return "calendar-event medium";
}

export default function PlanningCalendar({
  items = [],
  onSelectEvent,
  onMoveEvent
}) {
  const events = items
    .filter((item) => item.planned_date)
    .map((item) => {
      const start = new Date(
        `${item.planned_date}T${
          item.planned_time || "09:00:00"
        }`
      );

      const end = new Date(
        start.getTime() + 45 * 60 * 1000
      );

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
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="fr"
        defaultView="week"
        views={[
          "month",
          "week",
          "day",
          "agenda"
        ]}
        style={{ height: 720 }}
        selectable
        resizable
        draggableAccessor={() => true}
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
          noEventsInRange:
            "Aucune action planifiée."
        }}
        eventPropGetter={(event) => ({
          className: getEventColor(
            event.resource?.priority
          )
        })}
        onSelectEvent={(event) =>
          onSelectEvent?.(event.resource)
        }
        onEventDrop={({
          event,
          start
        }) => {
          onMoveEvent?.(
            event.resource,
            start
          );
        }}
      />
    </div>
  );
}