import app from "./web/server/api.mjs";

export default app;

const isDirectRun =
	process.argv[1] && process.argv[1].endsWith("/api.mjs");

if (isDirectRun) {
	const port = Number(process.env.PORT || 3001);
	app.listen(port, "0.0.0.0", () => {
		console.log(`API server listening on http://0.0.0.0:${port}`);
	});
}
