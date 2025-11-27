<div align="center">
  <h1>PyWhisper Studio</h1>
  <p>A desktop GUI implementation of <strong>Faster Whisper</strong> using a Python backend and React frontend.</p>
</div>

---

## ✨ Features

---

## 🧩 Requirements

- **Python ≥ 3.13**
- **Node.js ≥ 22**
- **pnpm ≥ 10** (enforced via `only-allow` in `preinstall`)

---

## 🛠️ Stack

### 🐍 Backend (Python)

| Tool           | Description                                                         |
| -------------- | ------------------------------------------------------------------- |
| **Python**     | Backend language for application logic.                             |
| **PyWebView**  | Provides a native desktop window with a Python ↔ JavaScript bridge. |
| **Ruff, MyPy** | Linting and static type checking for Python.                        |

### ⚛️ Frontend

| Tool / Library                    | Description                               |
| --------------------------------- | ----------------------------------------- |
| **React 19**                      | Framework for building the UI components. |
| **TypeScript**                    | Strong type checking.                     |
| **ESLint, Prettier**              | Code quality and formatting.              |
| **Tailwind CSS**                  | CSS library for styling.                  |
| **Vitest, React Testing Library** | Unit and component testing.               |
| **i18next, react-i18next**        | Internationalization support.             |

### 📦 Build Tools

| Tool                          | Description                                                             |
| ----------------------------- | ----------------------------------------------------------------------- |
| **PyInstaller**               | Bundles the Python application into a standalone executable.            |
| **PyFlow-TS**                 | Generates TypeScript types for the Python API function definitions.     |
| **Vite**                      | Bundles and optimizes frontend assets for production.                   |
| **TypeScript Compiler (TSC)** | Type checking and TypeScript declaration file generation.               |
| **pnpm**                      | Performant NPM with support to the `minimumReleaseAge` security feature |

---

## 📝 Commands

> [!NOTE]
>
> - Scripts prefixed with `_` are internal helpers and should not be run directly.
> - To change the React dev server port, update `vite.config.ts` and `entrypoint.py`.

> [!TIP]
>
> - For development, it is recommended to run the application with **frontend hot reload** using `pnpm dev:frontend` and `pnpm dev:backend`.
> - Alternatively, use `pnpm start` to run the app with the frontend bundled, which **behaves closer to the final production binary** but does not support hot reload.

| Action                               | Command             | Description                                                                                                           |
| ------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| ⚙️ Setup                             | `pnpm initialize`   | Install dependencies and create Python virtual environment.                                                           |
| ⚛️ Run Frontend                      | `pnpm dev:frontend` | Start React dev server. Can be accessed standalone if the `isStandalone` prop is set (e.g., `http://localhost:3000`). |
| 🔄 Run Backend (Frontend Hot Reload) | `pnpm dev:backend`  | Run PyWebView with hot reload (**requires `dev:frontend` running**).                                                  |
| 🐍 Run App (Bundled Frontend)        | `pnpm start`        | Build frontend and run PyWebView using the bundled assets.                                                            |
| 🔧 Generate API Types                | `pnpm gen-api`      | Generate TypeScript types for Python API using pyflow-ts.                                                             |
| 📦 Build                             | `pnpm build`        | Build the full application binary for distribution.                                                                   |
| 🧹 Clean                             | `pnpm clean`        | Remove build artifacts.                                                                                               |
