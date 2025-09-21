# Server Deployment (Compiled)
- Prod should run the compiled JS, not tsx.
- Build: `npm run -w server build` → outputs to `server/dist`.
- Run: `npm run -w server start:prod` (runs `node dist/server.js`).
- CI: `.github/workflows/server-build.yml` verifies server compiles on PRs.
- Dev remains `npm run -w server dev` (tsx).