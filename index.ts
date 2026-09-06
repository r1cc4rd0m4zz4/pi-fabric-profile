import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type {
  AutocompleteItem,
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

// Profili Formali SDD per Pi-Fabric (Document ID: SDD-SPEC-FABRIC-POST-UPDATE-01)
const PROFILES = {
  autopilot: {
    $schema:
      "https://raw.githubusercontent.com/monotykamary/pi-fabric/main/docs/schema.json",
    configVersion: 4,
    fullCodeMode: true,
    executor: {
      runtime: "quickjs",
      timeoutMs: 300000,
      maxTimeoutMs: 600000,
      memoryLimitBytes: 1073741824,
      resultFormat: "auto",
    },
    approvals: {
      read: "auto",
      write: "auto",
      execute: "auto",
      network: "auto",
      agent: "auto",
    },
    capture: {
      enabled: true,
      hideFromModel: true,
    },
    schema: {
      mode: "audit",
    },
    speculation: {
      enabled: true,
      maxConcurrent: 3,
      mcpAllowlist: ["github.*", "filesystem.*"],
    },
    compaction: {
      engine: "fabric",
      targetContextRatio: 0.4,
    },
    mcp: {
      enabled: true,
      cache: {
        enabled: true,
        revalidate: "changed",
        revalidateBudgetMs: 5000,
      },
      callTimeoutMs: 15000,
    },
    memory: {
      enabled: true,
      maxSessions: 200,
      indexThinking: false,
      indexToolOutput: false,
    },
    agents: {
      enabled: true,
      runner: "pi",
      transport: "auto",
      timeoutMs: 3600000,
      maxConcurrent: 4,
    },
    ui: {
      widget: "hidden",
      showAgentToolPreview: false,
      toolDisplay: "compact",
      haltOnEscape: true,
    },
    codePreview: {
      toolCallTiming: false,
      syntaxHighlighting: false,
    },
  },
  surgical: {
    $schema:
      "https://raw.githubusercontent.com/monotykamary/pi-fabric/main/docs/schema.json",
    configVersion: 4,
    fullCodeMode: true,
    executor: {
      runtime: "quickjs",
      timeoutMs: 45000,
      maxTimeoutMs: 120000,
      memoryLimitBytes: 536870912,
      resultFormat: "json",
    },
    approvals: {
      read: "auto",
      write: "ask",
      execute: "ask",
      network: "ask",
      agent: "ask",
    },
    capture: {
      enabled: true,
      hideFromModel: true,
    },
    schema: {
      mode: "enforce",
      certificateTtlMs: 60000,
      maxFiles: 5,
      maxBytes: 262144,
    },
    speculation: {
      enabled: false,
    },
    mcp: {
      enabled: true,
      callTimeoutMs: 15000,
    },
    agents: {
      enabled: true,
      runner: "pi",
      transport: "auto",
      timeoutMs: 3600000,
      maxConcurrent: 4,
    },
    ui: {
      widget: "hidden",
      showAgentToolPreview: false,
      toolDisplay: "full",
      haltOnEscape: true,
    },
    codePreview: {
      toolCallTiming: false,
      syntaxHighlighting: false,
    },
  },
  // Profilo Delta-Zero: eredita il 100% dei default vivi da DEFAULT_FABRIC_CONFIG upstream
  // senza alcun valore numerico hardcoded, applicando solo i salvavita anti-flickering.
  default: {
    $schema:
      "https://raw.githubusercontent.com/monotykamary/pi-fabric/main/docs/schema.json",
    configVersion: 4,
    fullCodeMode: true,
    ui: {
      widget: "hidden",
      showAgentToolPreview: false,
      toolDisplay: "compact",
      haltOnEscape: true,
    },
    codePreview: {
      toolCallTiming: false,
      syntaxHighlighting: false,
    },
  },
};

function applyEnvironmentInvariants(): void {
  process.env.CI = "1";
  process.env.DEBIAN_FRONTEND = "noninteractive";
  process.env.GIT_TERMINAL_PROMPT = "0";
  process.env.PAGER = "cat";
}

export default function (pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, _ctx) => {
    applyEnvironmentInvariants();
  });

  pi.registerCommand("fabric-profile", {
    description:
      "Commuta il profilo operativo di Pi-Fabric (autopilot / surgical / default / reset) o esegue la verifica SDD",
    getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
      const options = [
        {
          value: "autopilot",
          label: "autopilot",
          description: "Massima velocita, parallelismo, controlli audit",
        },
        {
          value: "surgical",
          label: "surgical",
          description: "Zero-Trust, approvazioni restrittive, schema enforce",
        },
        {
          value: "default",
          label: "default",
          description:
            "Delta-Zero: eredita tutti i default dinamici upstream senza hardcoding",
        },
        {
          value: "reset",
          label: "reset",
          description:
            "Eiezione: rimuove fabric.json e ripristina lo stato vergine upstream puro",
        },
        {
          value: "status",
          label: "status",
          description: "Ispeziona la configurazione attiva (locale e globale)",
        },
        {
          value: "verify",
          label: "verify",
          description: "Esegui i 7 test empirici di certificazione SDD",
        },
        {
          value: "autopilot --global",
          label: "autopilot --global",
          description: "Applica autopilot a ~/.pi/agent/fabric.json",
        },
        {
          value: "surgical --global",
          label: "surgical --global",
          description: "Applica surgical a ~/.pi/agent/fabric.json",
        },
        {
          value: "default --global",
          label: "default --global",
          description: "Applica default delta-zero a ~/.pi/agent/fabric.json",
        },
        {
          value: "reset --global",
          label: "reset --global",
          description: "Rimuove ~/.pi/agent/fabric.json globale",
        },
      ];
      const filtered = options.filter((o) =>
        o.value.startsWith(prefix.toLowerCase()),
      );
      return filtered.length > 0 ? filtered : null;
    },
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      applyEnvironmentInvariants();

      const raw = typeof args === "string" ? args.trim() : "";
      const isGlobal = raw.includes("--global") || raw.includes("-g");
      const cleanArgs = raw
        .replace(/--global|-g/g, "")
        .trim()
        .toLowerCase();

      let target = cleanArgs;
      if (!target) {
        const choice = await ctx.ui.select("Seleziona Azione Pi-Fabric (SDD)", [
          "autopilot (Massima velocita e parallelismo, controlli audit)",
          "surgical (Zero-Trust, approvazioni restrittive, schema enforce)",
          "default (Delta-Zero: eredita tutti i default dinamici upstream)",
          "reset (Eiezione: rimuove fabric.json per stato vergine puro)",
          "status (Ispeziona configurazione attiva)",
          "verify (Esegui test empirici di certificazione)",
        ]);
        if (!choice) return;
        target = choice.split(" ")[0];
      }

      const localDir = path.join(ctx.cwd || process.cwd(), ".pi");
      const localPath = path.join(localDir, "fabric.json");
      const globalDir = path.join(os.homedir(), ".pi/agent");
      const globalPath = path.join(globalDir, "fabric.json");

      const targetDir = isGlobal ? globalDir : localDir;
      const targetPath = isGlobal ? globalPath : localPath;
      const scopeLabel = isGlobal
        ? "GLOBALE (~/.pi/agent/fabric.json)"
        : "LOCALE (.pi/fabric.json)";

      // Gestione Azione RESET (Eiezione pura)
      if (target === "reset") {
        try {
          if (fs.existsSync(targetPath)) {
            const bak = path.join(targetDir, "fabric.json.bak");
            fs.copyFileSync(targetPath, bak);
            fs.unlinkSync(targetPath);
          }
          ctx.ui.notify(
            `Configurazione rimossa (${scopeLabel})! Ripristinato stato puro di fabbrica di Pi-Fabric. Ricaricamento...`,
            "info",
          );
          await ctx.reload();
          return;
        } catch (e: any) {
          if (e?.message?.includes("stale")) return;
          try {
            ctx.ui.notify(`Errore reset: ${e.message}`, "error");
          } catch (notifyErr: any) {
            console.error(
              "Impossibile notificare l'errore:",
              notifyErr?.message,
            );
          }
          return;
        }
      }

      if (target === "status") {
        const hasLocal = fs.existsSync(localPath);
        const hasGlobal = fs.existsSync(globalPath);
        if (!hasLocal && !hasGlobal) {
          ctx.ui.notify(
            "Nessun file fabric.json rilevato. Pi-Fabric gira con DEFAULT nativo upstream puro al 100%.",
            "info",
          );
          return;
        }

        function identifyProfile(cfg: any): string {
          if (!cfg) return "STOCK VERGINE";
          const isSurgical =
            cfg.schema?.mode === "enforce" &&
            cfg.approvals?.execute === "ask" &&
            cfg.approvals?.network === "ask";
          if (isSurgical) return "SURGICAL (Zero-Trust)";
          const isAutopilot =
            cfg.schema?.mode === "audit" &&
            cfg.approvals?.execute === "auto" &&
            cfg.approvals?.network === "auto";
          if (isAutopilot) return "AUTOPILOT (Velocity)";
          if (!cfg.approvals && !cfg.executor) {
            return "DEFAULT (Delta-Zero Dinamico Upstream)";
          }
          return "CUSTOM (Personalizzato)";
        }

        try {
          const activePath = hasLocal ? localPath : globalPath;
          const activeScope = hasLocal ? "locale [p]" : "globale [u]";
          const cfg = JSON.parse(fs.readFileSync(activePath, "utf-8"));
          const profileName = identifyProfile(cfg);
          const mode = cfg.schema?.mode ?? "off (upstream)";
          const execPerm = cfg.approvals?.execute ?? "allow (upstream)";
          const netPerm = cfg.approvals?.network ?? "allow (upstream)";
          const timeoutSec = cfg.executor?.timeoutMs
            ? `${Math.round(cfg.executor.timeoutMs / 1000)}s`
            : "120s (upstream)";

          let msg = `Fabric (${activeScope}) -> Profilo: ${profileName} | schema=${mode} | exec=${execPerm} | net=${netPerm} | timeout=${timeoutSec}`;
          if (hasLocal && hasGlobal) {
            msg += " (Override locale attivo sul default globale)";
          }

          ctx.ui.notify(msg, "info");
        } catch (e: any) {
          ctx.ui.notify(`Errore lettura config: ${e.message}`, "error");
        }
        return;
      }

      if (target === "verify") {
        ctx.ui.notify("Esecuzione suite empirica SDD in corso...", "info");
        try {
          const scriptDir = typeof import.meta.dirname === "undefined"
            ? path.dirname(new URL(import.meta.url).pathname)
            : import.meta.dirname;
          const candidateScripts = [
            path.join(scriptDir, "test/verify.mjs"),
            path.join(scriptDir, "../test/verify.mjs"),
            path.join(scriptDir, "verify.mjs"),
            path.join(
              ctx.cwd || process.cwd(),
              "scripts/test_fabric_empirical.mjs",
            ),
            path.join(
              os.homedir(),
              ".pi/agent/scripts/test_fabric_empirical.mjs",
            ),
          ];
          const testScript = candidateScripts.find((p) => fs.existsSync(p));
          if (!testScript) {
            ctx.ui.notify(
              "Script test_fabric_empirical.mjs non trovato né in scripts/ né in ~/.pi/agent/scripts/",
              "error",
            );
            return;
          }

          const { spawnSync } = await import("node:child_process");
          const res = spawnSync(process.execPath, [testScript], {
            cwd: ctx.cwd || process.cwd(),
            env: process.env,
            encoding: "utf-8",
          });

          if (res.status === 0) {
            ctx.ui.notify(
              "Tutti i 7 probe empirici SDD sono stati superati al 100%!",
              "info",
            );
          } else {
            const failDetail =
              res.stderr?.trim() ||
              res.stdout?.split("\n").find((l: string) => l.includes("[✖]")) ||
              res.error?.message ||
              `exit code ${res.status}`;
            ctx.ui.notify(
              `Verifica fallita: ${failDetail.slice(0, 120)}`,
              "error",
            );
          }
        } catch (e: any) {
          ctx.ui.notify(`Errore esecuzione verifica: ${e.message}`, "error");
        }
        return;
      }

      if (
        target !== "autopilot" &&
        target !== "surgical" &&
        target !== "default"
      ) {
        ctx.ui.notify(
          `Profilo non riconosciuto: '${target}'. Usa autopilot, surgical, default o reset.`,
          "error",
        );
        return;
      }

      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        if (fs.existsSync(targetPath)) {
          const bak = path.join(targetDir, "fabric.json.bak");
          fs.copyFileSync(targetPath, bak);
        }

        const selected = PROFILES[target as keyof typeof PROFILES];
        fs.writeFileSync(
          targetPath,
          JSON.stringify(selected, null, 2) + "\n",
          "utf-8",
        );

        ctx.ui.notify(
          `Profilo '${target.toUpperCase()}' applicato (${scopeLabel})! Ricaricamento in corso...`,
          "info",
        );

        await ctx.reload();
        return;
      } catch (e: any) {
        if (e?.message?.includes("stale")) return;
        try {
          ctx.ui.notify(`Errore applicazione profilo: ${e.message}`, "error");
        } catch (notifyErr: any) {
          console.error("Impossibile notificare l'errore:", notifyErr?.message);
        }
      }
    },
  });
}
