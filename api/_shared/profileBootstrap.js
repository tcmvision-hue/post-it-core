export function handleProfileBootstrap(req, res) {
  const method = String(req?.method || "").toUpperCase();

  if (method === "GET") {
    return res.status(200).json({ ok: true, endpoint: "profile/bootstrap" });
  }

  if (method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { profileId, language } = req.body || {};

  if (!profileId || typeof profileId !== "string") {
    return res.status(400).json({ error: "profileId is required" });
  }

  return res.status(200).json({
    success: true,
    profileId,
    language: language || "nl",
  });
}
