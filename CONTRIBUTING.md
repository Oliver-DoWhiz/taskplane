# Contributing

Taskplane is early, so contributions should preserve the core product thesis: explicit task state over hidden conversational state.

## Principles

- Keep modules small and legible.
- Prefer explicit objects and event trails over implicit side effects.
- If a change adds workflow power, it should also improve observability or reviewability.

## Local Workflow

```bash
npm run dev
npm test
```

The project is intentionally zero-dependency at runtime. Keep that property unless a new dependency meaningfully improves the control plane or operator surface.

## Pull Requests

- Explain the product problem the change solves.
- List the exact verification commands you ran.
- Include screenshots when the operator dashboard changes in a meaningful way.

