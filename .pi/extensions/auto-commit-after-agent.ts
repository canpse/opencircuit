import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type GitChange = {
  path: string;
  status: string;
};

const COMMIT_PREFIX = "[pi]";

export default function (pi: ExtensionAPI) {
  let touchedWorkspace = false;
  let committing = false;

  pi.on("session_start", async (_event, ctx) => {
    if (ctx.hasUI) {
      ctx.ui.notify("Auto-commit do pi carregado. Alterações serão commitadas ao fim de cada resposta.", "info");
    }
  });

  pi.on("tool_execution_end", async (event) => {
    if (["edit", "write", "bash"].includes(event.toolName)) {
      touchedWorkspace = true;
    }
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (committing || !touchedWorkspace) return;
    touchedWorkspace = false;
    committing = true;

    try {
      const status = await git(pi, ctx.cwd, ["status", "--porcelain"]);
      if (status.code !== 0 || status.stdout.trim().length === 0) return;

      const changes = parseStatus(status.stdout);
      const message = buildCommitMessage(changes);

      await git(pi, ctx.cwd, ["add", "-A"]);
      const commit = await git(pi, ctx.cwd, ["commit", "-m", message.subject, "-m", message.body]);

      if (ctx.hasUI) {
        if (commit.code === 0) {
          ctx.ui.notify(`Auto-commit criado: ${message.subject}`, "info");
        } else {
          ctx.ui.notify(`Auto-commit falhou: ${commit.stderr || commit.stdout}`.slice(0, 240), "warning");
        }
      }
    } finally {
      committing = false;
    }
  });

  pi.registerCommand("autocommit", {
    description: "Cria um commit imediato com as alterações atuais",
    handler: async (_args, ctx) => {
      const status = await git(pi, ctx.cwd, ["status", "--porcelain"]);
      if (status.code !== 0 || status.stdout.trim().length === 0) {
        ctx.ui.notify("Nada para commitar.", "info");
        return;
      }

      const changes = parseStatus(status.stdout);
      const message = buildCommitMessage(changes);
      await git(pi, ctx.cwd, ["add", "-A"]);
      const commit = await git(pi, ctx.cwd, ["commit", "-m", message.subject, "-m", message.body]);
      ctx.ui.notify(commit.code === 0 ? `Commit criado: ${message.subject}` : "Falha ao criar commit.", commit.code === 0 ? "info" : "warning");
    },
  });
}

async function git(pi: ExtensionAPI, cwd: string, args: string[]) {
  return pi.exec("git", args, { cwd, timeout: 30_000 });
}

function parseStatus(output: string): GitChange[] {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2).trim() || "M",
      path: line.slice(3).replace(/^"|"$/g, ""),
    }));
}

function buildCommitMessage(changes: GitChange[]) {
  const paths = changes.map((change) => change.path);
  const subject = `${COMMIT_PREFIX} ${inferSubject(paths)}`;
  const body = [
    summarizeChanges(changes),
    "",
    "Arquivos principais:",
    ...paths.slice(0, 12).map((path) => `- ${path}`),
    paths.length > 12 ? `- ... e mais ${paths.length - 12} arquivo(s)` : "",
  ].filter(Boolean).join("\n");

  return { subject, body };
}

function inferSubject(paths: string[]): string {
  const onlyDocs = paths.every((path) => path.endsWith(".md") || path.endsWith(".html") || path.startsWith("docs/"));
  if (onlyDocs) return "docs: atualiza documentação";

  const extensionOnly = paths.every((path) => path.startsWith(".pi/extensions/"));
  if (extensionOnly) return "chore: adiciona extensão de auto-commit";

  const touchesCore = paths.some((path) => path.startsWith("src/core/"));
  const touchesUi = paths.some((path) => path.startsWith("src/ui/"));
  const touchesExamples = paths.some((path) => path.startsWith("src/examples/") || path.startsWith("examples/"));
  const touchesTests = paths.some((path) => path.startsWith("tests/"));

  if (touchesCore && touchesUi) return "feat: atualiza simulador e interface";
  if (touchesCore) return "feat: atualiza core de simulação";
  if (touchesUi) return "feat: atualiza interface do editor";
  if (touchesExamples) return "docs: atualiza exemplos didáticos";
  if (touchesTests) return "test: atualiza testes";

  return "chore: salva alterações do pi";
}

function summarizeChanges(changes: GitChange[]): string {
  const added = changes.filter((change) => change.status.includes("A") || change.status.includes("?")).length;
  const modified = changes.filter((change) => change.status.includes("M")).length;
  const deleted = changes.filter((change) => change.status.includes("D")).length;
  const renamed = changes.filter((change) => change.status.includes("R")).length;

  return `Resumo: ${changes.length} arquivo(s) alterado(s)`
    + (added ? `, ${added} adicionado(s)` : "")
    + (modified ? `, ${modified} modificado(s)` : "")
    + (deleted ? `, ${deleted} removido(s)` : "")
    + (renamed ? `, ${renamed} renomeado(s)` : "")
    + ".";
}
