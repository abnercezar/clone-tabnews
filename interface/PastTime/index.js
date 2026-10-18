const UNITS = [
  { seconds: 60 * 60 * 24 * 365, singular: "ano", plural: "anos" },
  { seconds: 60 * 60 * 24 * 30, singular: "mês", plural: "meses" },
  { seconds: 60 * 60 * 24, singular: "dia", plural: "dias" },
  { seconds: 60 * 60, singular: "hora", plural: "horas" },
  { seconds: 60, singular: "minuto", plural: "minutos" },
  { seconds: 1, singular: "segundo", plural: "segundos" },
];

export function formatPastTime(date, now = Date.now()) {
  const elapsedSeconds = Math.max(
    0,
    Math.round((now - new Date(date).getTime()) / 1000),
  );

  for (const unit of UNITS) {
    const amount = Math.floor(elapsedSeconds / unit.seconds);
    if (amount >= 1) {
      return `${amount} ${amount > 1 ? unit.plural : unit.singular} atrás`;
    }
  }

  return "agora";
}

function formatFullDate(date) {
  return new Date(date).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default function PastTime({ date }) {
  if (!date) {
    return null;
  }

  return (
    <time dateTime={date} title={formatFullDate(date)}>
      {formatPastTime(date)}
    </time>
  );
}
