import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const python = path.join(
  root,
  ".venv",
  isWindows ? "Scripts/python.exe" : "bin/python",
);

/** Pass literal argument arrays so paths with spaces never require a shell. */
const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PYTHONUTF8: "1" },
  });
  if (result.error) {
    console.error(result.error.message);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const versionCheck = [
  "-c",
  'import sys; sys.exit("Python 3.13 or newer is required.") if sys.version_info < (3, 13) else None',
];
const action = process.argv[2];
if (action === "initialize") {
  // Reuse the project's interpreter when the system command points to another version.
  if (!existsSync(python)) {
    const systemPython = process.env.PYTHON ?? (isWindows ? "python" : "python3");
    run(systemPython, versionCheck);
    run(systemPython, ["-m", "venv", ".venv"]);
  }
  run(python, versionCheck);
  run(python, ["-m", "pip", "install", "-r", "requirements-dev.txt"]);
} else {
  const commands = {
    backend: ["backend/main.py"],
    generate: ["scripts/generate_api.py"],
    check: ["scripts/generate_api.py", "--check"],
    package: ["-m", "PyInstaller", "pyinstaller/pywebview-react.spec"],
  };
  if (!commands[action]) {
    throw new Error(`Unknown Python action: ${action}`);
  }
  run(python, versionCheck);
  run(python, commands[action]);
}
