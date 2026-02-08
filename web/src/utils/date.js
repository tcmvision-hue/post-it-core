export function todayKey() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
}

export function getDaypart(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "ochtend";
  if (h >= 12 && h < 18) return "middag";
  return "avond";
}

export function getDaypartGreeting(now = new Date()) {
  const part = getDaypart(now);
  if (part === "ochtend") return "Goedemorgen.";
  if (part === "middag") return "Goedemiddag.";
  return "Goedenavond.";
}

export function getDaypartKey(now = new Date()) {
  const part = getDaypart(now);
  const date = new Date(now);
  if (part === "avond" && now.getHours() < 5) {
    date.setDate(date.getDate() - 1);
  }
  return `${date.toISOString().split("T")[0]}-${part}`;
}
