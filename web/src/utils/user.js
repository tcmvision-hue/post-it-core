function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return (
    "u-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

export function getUser() {
  const stored = localStorage.getItem("post-this:user");

  if (stored) {
    return JSON.parse(stored);
  }

  const user = {
    id: generateId(),
    username: null,
    createdAt: Date.now(),
  };

  localStorage.setItem("post-this:user", JSON.stringify(user));
  return user;
}
