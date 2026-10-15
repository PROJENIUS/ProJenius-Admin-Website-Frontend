const dateTimeFormatter = (timeZone) => new Intl.DateTimeFormat("en-CA", {
  timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function toLocalDateTime(value, timeZone) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const parts = Object.fromEntries(dateTimeFormatter(timeZone).formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromLocalDateTime(value, timeZone) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid date and time.");
  const wanted = match.slice(1).map(Number);
  const target = Date.UTC(wanted[0], wanted[1] - 1, wanted[2], wanted[3], wanted[4]);
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(dateTimeFormatter(timeZone).formatToParts(new Date(candidate)).map(({ type, value: part }) => [type, Number(part)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    candidate += target - represented;
  }
  const check = toLocalDateTime(new Date(candidate), timeZone);
  if (check !== value) throw new Error("This local time is not valid in the selected timezone (it may fall in a daylight-saving gap).");
  return new Date(candidate).toISOString();
}

export function serializeCourseBatches(batches = []) {
  return batches.map((batch) => ({
    ...batch,
    startsAt: fromLocalDateTime(batch.startsAt, batch.timezone),
    endsAt: fromLocalDateTime(batch.endsAt, batch.timezone),
    registrationOpensAt: fromLocalDateTime(batch.registrationOpensAt, batch.timezone),
    registrationClosesAt: fromLocalDateTime(batch.registrationClosesAt, batch.timezone),
    sessions: (batch.sessions || []).map((session) => ({
      ...session,
      startsAt: fromLocalDateTime(session.startsAt, batch.timezone),
      endsAt: fromLocalDateTime(session.endsAt, batch.timezone),
    })),
  }));
}

export function editCourseBatches(batches = []) {
  return batches.map((batch) => {
    const timezone = batch.timezone || "Asia/Kolkata";
    return {
      ...batch,
      startsAt: toLocalDateTime(batch.startsAt, timezone),
      endsAt: toLocalDateTime(batch.endsAt, timezone),
      registrationOpensAt: toLocalDateTime(batch.registrationOpensAt, timezone),
      registrationClosesAt: toLocalDateTime(batch.registrationClosesAt, timezone),
      sessions: (batch.sessions || []).map((session) => ({
        ...session,
        startsAt: toLocalDateTime(session.startsAt, timezone),
        endsAt: toLocalDateTime(session.endsAt, timezone),
      })),
    };
  });
}
