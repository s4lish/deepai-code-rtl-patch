// Enable/disable DeepAI Code auto-updates via the app's official
// T3CODE_DISABLE_AUTO_UPDATE environment variable.
//
// Usage:
//   node disable-auto-updates.mjs off      -> block auto-updates (default)
//   node disable-auto-updates.mjs on       -> re-enable auto-updates
//   node disable-auto-updates.mjs status   -> show current state
import { execFileSync } from "node:child_process";

const NAME = "T3CODE_DISABLE_AUTO_UPDATE";
const arg = (process.argv[2] || "off").toLowerCase();

const current = () => {
  try {
    const out = execFileSync(
      "reg",
      ["query", "HKCU\\Environment", "/v", NAME],
      { encoding: "utf8" },
    );
    const m = out.match(/REG_(?:SZ|EXPAND_SZ)\s+(\S+)/);
    return m ? m[1] : "";
  } catch {
    return "";
  }
};

if (arg === "status") {
  const v = current();
  console.log(`${NAME} = ${v ? v : "(not set — auto-updates ENABLED)"}`);
  process.exit(0);
}

if (arg === "off") {
  execFileSync("setx", [NAME, "true"], { stdio: "inherit" });
  console.log(
    `[rtl-patch] auto-updates DISABLED (${NAME}=true). Fully close and reopen DeepAI Code (or log out/in) for it to take effect.`,
  );
  console.log(
    "[rtl-patch] To update manually later: run this script with 'on', update the app, then re-run 'off' and re-apply the RTL patch.",
  );
} else if (arg === "on") {
  execFileSync("reg", ["delete", "HKCU\\Environment", "/v", NAME, "/f"], { stdio: "ignore" });
  console.log("[rtl-patch] auto-updates re-ENABLED (variable removed). Restart the app to apply.");
} else {
  console.error("usage: node disable-auto-updates.mjs [off|on|status]");
  process.exit(1);
}
