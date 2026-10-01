# Code style

## TypeScript and React

- Follow existing TypeScript, React, ESLint, and Prettier patterns.
- Prefer clear names, short functions, and early returns; extract for reuse or clearer responsibility.
- Use functional components and hooks. Avoid unnecessary `useCallback` and `useMemo`.
- Use `PascalCase` for components/types, `camelCase` for values/functions, and `use` for hooks.
- Prefix booleans with `is`, `has`, `should`, `can`, `did`, or `will`.
- Use the existing import aliases and keep feature-specific code inside its feature.
- Handle rejected bridge promises and show actionable errors.

## Python

- Follow Ruff and MyPy; annotate parameters and return values.
- Use `snake_case` for values/functions, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for constants.
- Keep API DTOs in `backend/schemas/`; use `TypedDict` for data crossing the bridge.
- Use `logging` for diagnostics and `logger.exception` when catching an error.
- Keep `Optional`/`Union` in exposed API signatures where PyFlow-TS requires them.

## UI and language

- Use Tailwind/DaisyUI for component styles; use CSS for shared animations, theme, and base styles.
- Use i18next for UI text in English and Spanish. Code, identifiers, and comments are in English.
- Prefer native HTML semantics and accessible names for non-text controls.

## Comments and complexity

- Put a brief, one-line comment above a statement or block when its reason is not clear from the code.
- Explain constraints and decisions, not what the next line does. Use `NOTE:` or `TODO:` only when useful.
- Link the source for a workaround or an unusual external requirement.
- Add guards, defensive state, or retries only when a concrete failure risk justifies them.

## Shared contracts

- Preserve Python ↔ TypeScript names, including API methods, DTO fields, state keys, and dropzone IDs.
- Generate `frontend/src/types/pywebview/pywebview-api.d.ts` with `pnpm gen-api`; review its diff. Maintain `pywebview-state.ts` alongside Python state changes.
