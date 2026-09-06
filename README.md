# pi-fabric-profile

> **Deterministic operational profile switcher & empirical verification harness for [Pi-Fabric](https://github.com/monotykamary/pi-fabric).**  
> *"Velocity without control is an outage waiting to happen."*

---

## Why this exists

[Pi-Fabric](https://github.com/monotykamary/pi-fabric) provides a programmable agent runtime and execution kernel for [Pi](https://github.com/earendil-works/pi-coding-agent). While Fabric's default configuration is versatile, real-world workflows often require distinct postures:

1. **High-Velocity Autopilot:** When iterating rapidly on feature code, you want parallel workflows, extended deadlines, automated approvals, and audit-mode schema checks without interactive approval fatigue.
2. **Zero-Trust Surgical Mode:** When auditing untrusted pull requests, handling cryptographic primitives, or working in sensitive repositories, you need strict `enforce` mode, conservative memory bounds, and explicit operator gates (`ask`) on shell execution and network access.
3. **Delta-Zero Default:** Inheriting live upstream defaults without hardcoded parameter drift, while protecting terminal stability against TUI flickering.

`pi-fabric-profile` is a zero-dependency Pi package and extension that automates switching between these postures atomically, injects non-interactive subprocess invariants, and includes an empirical verification suite to prove sandbox and runtime guarantees.

---

## Capabilities

* ⚡ **One-Shot Profile Switching:** Switch between `autopilot`, `surgical`, `default` (delta-zero upstream), and `reset` (clean ejection) with TAB autocompletion.
* 🔄 **Instant In-Process Reload:** Applying a profile updates `.pi/fabric.json` (or global `~/.pi/agent/fabric.json`) and reloads the runtime immediately without restarting Pi.
* 🛡️ **Subprocess Hardening:** Hooks `session_start` to enforce non-interactive invariants (`CI=1`, `DEBIAN_FRONTEND=noninteractive`, `GIT_TERMINAL_PROMPT=0`, `PAGER=cat`), eliminating terminal lockups on Git credential prompts or paging tools.
* 🧪 **7-Probe Empirical Verification:** Runs formal runtime checks asserting QuickJS WASM isolation, FD0/stdin EOF detachment, `/dev/tty` fail-fast behavior, and shell exit code handling.

---

## Installation

### A. Official Pi Package (Recommended)

Install directly via Pi's package manager:

```bash
pi install git:github.com/r1cc4rd0m4zz4/pi-fabric-profile
```

### B. Local Development / Symlink

If you clone or maintain the repository locally:

```bash
pi install /path/to/pi-fabric-profile
```

### C. Manual Copy

Copy `index.ts` into your Pi extensions directory:

```bash
# Global
cp index.ts ~/.pi/agent/extensions/fabric-profile.ts

# Or project-local
mkdir -p .pi/extensions && cp index.ts .pi/extensions/fabric-profile.ts
```

Reload Pi to activate:

```text
/reload
```

---

## Commands & Usage

### 1. Interactive Selector

Type `/fabric-profile` and hit `Enter` to open the interactive selection dialog:

```text
/fabric-profile
```

### 2. Direct Profile Selection

```text
/fabric-profile autopilot            # High-velocity mode for local .pi/fabric.json
/fabric-profile surgical             # Zero-trust mode for local .pi/fabric.json
/fabric-profile default              # Upstream dynamic defaults
/fabric-profile reset                # Clean ejection: removes local fabric.json

# Global flags (affects ~/.pi/agent/fabric.json)
/fabric-profile autopilot --global
/fabric-profile surgical --global
/fabric-profile default --global
/fabric-profile reset --global
```

### 3. Inspect Active Posture

```text
/fabric-profile status
```

Reports active scope, detected profile, schema enforcement mode, approval policies, and execution timeouts in real time.

### 4. Run Empirical SDD Verification

```text
/fabric-profile verify
```

Runs the 7 empirical probes against the live environment and reports pass/fail directly in the Pi UI.

---

## Operational Profiles Matrix

| Dimension | **AUTOPILOT (Velocity)** | **SURGICAL (Zero-Trust)** | **DEFAULT (Delta-Zero)** |
| :--- | :--- | :--- | :--- |
| **Primary Use** | Feature development, builds, refactoring | Untrusted PR audits, auth/crypto | Stock Fabric behavior |
| **Schema Mode** | `audit` (non-blocking observation) | `enforce` (strict SHA-256 certificate gates) | Dynamic upstream |
| **Shell (`pi.bash`)** | `auto` | `ask` (operator gate) | Dynamic upstream |
| **Network Policy** | `auto` | `ask` (operator gate) | Dynamic upstream |
| **Execution Timeout** | `300s` (heavy builds/tests) | `45s` (strict deadline) | Upstream default (`120s`) |
| **WASM Memory Limit** | `1024 MB` | `512 MB` | Upstream default (`64 MB`) |
| **Tool Capture** | `hideFromModel: true` | `hideFromModel: true` | `hideFromModel: true` |
| **Anti-Flicker** | `widget: hidden`, `toolCallTiming: false` | Full transcript visibility | `widget: hidden`, `toolCallTiming: false` |

---

## Empirical Verification Matrix

The verification suite (`npm test` or `/fabric-profile verify`) tests real kernel & runtime invariants:

* **[PROBE 1] Config Schema:** Validates `fabric.json` structure and active configuration keys.
* **[PROBE 2] QuickJS WASM Sandbox:** Verifies that ambient Node globals (`process`, `require`) are strictly `undefined` inside the QuickJS guest VM.
* **[PROBE 3] FD0 / Stdin EOF:** Confirms file descriptor 0 is bound to `/dev/null` and returns immediate EOF.
* **[PROBE 4] /dev/tty Detachment:** Asserts that `setsid()` detachment causes `open('/dev/tty')` to fail-fast with `ENXIO` (`Device not configured`).
* **[PROBE 5] Non-Interactive Git:** Spawns a local HTTP 401 challenge and asserts that `GIT_TERMINAL_PROMPT=0` aborts without hanging on terminal prompts.
* **[PROBE 6] Shell Settle Contract:** Asserts that non-zero exit codes preserve exit codes without throwing unhandled rejections.
* **[PROBE 7] Payload Pinning (`π`):** Verifies byte-for-byte fidelity of untrusted string arguments without template breakout risks.

---

## Acknowledgements

Special thanks to **[monotykamary](https://github.com/monotykamary)**, creator of **[pi-fabric](https://github.com/monotykamary/pi-fabric)** and core contributor across the Pi ecosystem.

`pi-fabric-profile` is built as an operational companion to pi-fabric. It exists to complement the elegant architecture of Fabric's QuickJS sandboxing, multi-agent mesh, and capability routing by providing immediate, friction-free profile switching for developers across varying security and velocity requirements.

---

## License

MIT © [r1cc4rd0m4zz4](https://github.com/r1cc4rd0m4zz4)
