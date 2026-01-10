function generateId() {
  return (
    "u-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

export function getUser() {
  const stored = localStorage.getItem("post-it:user");

  if (stored) {
    return JSON.parse(stored);
  }

  const user = {
    id: generateId(),
    username: null,
    createdAt: Date.now(),
  };

  localStorage.setItem("post-it:user", JSON.stringify(user));
  return user;
}
