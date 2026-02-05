# POST-IT Core Copilot Instructions

## Project Overview
This is a phased React web application for generating social media posts using AI. Phase 1 focuses solely on the intake and generation flow without routing, data persistence, accounts, or post-intake decisions.

## Architecture
- **Frontend**: React app built with Vite, structured in phases (Welcome → Explanation → Intake → Keywords → Generation → SelectPost → FinalOutput). State managed via React hooks in `App.jsx`.
- **Backend**: Express server on port 3001, serving `/api/generate` endpoint using OpenAI GPT-4o-mini.
- **Key Files**:
  - `web/src/App.jsx`: Main phase logic and state management.
  - `web/src/ai/generatePost.js`: AI generation function with 30s timeout to prevent hanging.
  - `web/server/api.mjs`: Express API with OpenAI integration.
  - `web/src/ui/home/`: Phase components (e.g., `Generation.jsx` calls `generatePost`).

## Developer Workflows
- **Start Frontend**: `cd web && npm run dev` (Vite dev server, proxies API calls).
- **Start Backend**: `cd web && node server/api.mjs` (requires `OPENAI_API_KEY` env var).
- **Build**: `cd web && npm run build` (Vite production build).
- **Lint**: `cd web && npm run lint` (ESLint with React rules).
- **Test Generation**: Call `generatePost` with params like `{role: "expert", platform: "LinkedIn", doelgroep: "professionals", intentie: "inform", waaromNu: "current trends", keywords: ["AI", "tech"]}`.

## Conventions
- **Keywords Handling**: Always use `(keywords || []).join(", ")` to avoid null errors.
- **Error Handling**: Throw descriptive errors; no silent failures. Use try/catch in components.
- **Phased Development**: Changes must define new phases explicitly; no modifications to Phase 1 code without phase definition.
- **AI Prompts**: System prompt enforces strict rules (no emojis, hashtags, CTAs); user prompt formats all input fields.
- **Imports**: Use relative paths for components (e.g., `import Welcome from "./ui/home/Welcome"`).

## Integration Points
- **OpenAI API**: Backend fetches from OpenAI with system/user messages; handles API errors gracefully.
- **Fetch Calls**: Frontend uses relative URLs (e.g., `/api/generate`); backend binds to `0.0.0.0:3001` for public access.
- **Environment**: Set `OPENAI_API_KEY` before running backend; no other external deps.

## Common Patterns
- **Phase Components**: Each phase is a functional component exported from `ui/home/`. Use `onComplete` prop for navigation.
- **Generation Flow**: `Generation.jsx` generates up to 3 posts asynchronously; stops on user action or completion.
- **Day Locking**: Once a post is selected, app locks to `FinalOutput` (no further changes until refresh).

Avoid adding routing, persistence, or AI decision logic beyond generation — these are Phase 2+ features.