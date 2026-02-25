// filepath: /workspaces/post-it-core/api/[...all].js
module.exports = async (req, res) => {
  try {
    const mod = await import("../web/api/[...all].js");
    const handler = mod.default || mod;
    return handler(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "API bridge failed", detail: String(err?.message || err) }));
  }
};
