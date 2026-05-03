export function fmtKickoff(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(d);
}

export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}

export function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "Groepsfase",
    LAST_16: "Achtste finales",
    ROUND_OF_16: "Achtste finales",
    QUARTER_FINALS: "Kwartfinales",
    SEMI_FINALS: "Halve finales",
    THIRD_PLACE: "3e/4e plaats",
    FINAL: "Finale",
  };
  return map[stage] ?? stage;
}

export function isKnockoutStage(stage: string): boolean {
  return stage !== "GROUP_STAGE";
}

export function dayKey(iso: string): string {
  // YYYY-MM-DD in Amsterdam timezone — used for grouping matches into days
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const da = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${da}`;
}

export function fmtDayShort(key: string): { weekday: string; day: string; month: string } {
  const d = new Date(`${key}T12:00:00Z`);
  const wd = new Intl.DateTimeFormat("nl-NL", { weekday: "short", timeZone: "Europe/Amsterdam" }).format(d);
  const day = new Intl.DateTimeFormat("nl-NL", { day: "numeric", timeZone: "Europe/Amsterdam" }).format(d);
  const month = new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "Europe/Amsterdam" }).format(d);
  return { weekday: wd.replace(".", ""), day, month: month.replace(".", "") };
}

export function fmtDayLong(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  }).format(d);
}

export function todayKey(): string {
  return dayKey(new Date().toISOString());
}
