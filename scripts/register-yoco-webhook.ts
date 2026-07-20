/**
 * Registers this site's Yoco webhook endpoint and prints the signing secret.
 *
 *   npm run yoco:register-webhook
 *
 * Needs YOCO_SECRET_KEY and NEXT_PUBLIC_SITE_URL in the environment. Yoco has no
 * dashboard UI for webhooks — they're managed over the API — so this registers
 * {NEXT_PUBLIC_SITE_URL}/api/yoco/webhook and echoes the whsec_… secret to copy
 * into YOCO_WEBHOOK_SECRET. Safe to re-run; it lists existing hooks first and
 * skips creation if this URL is already registered.
 */
import { readFileSync } from "fs";

const API_BASE = "https://payments.yoco.com/api";

// Load .env without a dependency (tsx doesn't do this automatically).
function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  } catch {
    // No .env file — rely on the ambient environment.
  }
}

async function main() {
  loadEnv();

  const key = process.env.YOCO_SECRET_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!key) throw new Error("YOCO_SECRET_KEY is not set");
  if (!site) throw new Error("NEXT_PUBLIC_SITE_URL is not set");

  const url = `${site.replace(/\/$/, "")}/api/yoco/webhook`;
  const auth = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const existing = await fetch(`${API_BASE}/webhooks`, { headers: auth });
  if (existing.ok) {
    const body = (await existing.json()) as { subscriptions?: { url: string }[] };
    if (body.subscriptions?.some((s) => s.url === url)) {
      console.log(`✓ Webhook already registered for ${url}`);
      console.log("  (Yoco only reveals the secret at creation — delete it in the API to re-issue.)");
      return;
    }
  }

  const res = await fetch(`${API_BASE}/webhooks`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ name: "lifestyle-clothing-orders", url }),
  });
  if (!res.ok) {
    throw new Error(`Registration failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { secret?: string; id?: string };
  console.log(`✓ Registered webhook → ${url}`);
  if (data.secret) {
    console.log(`\n  Set this in your environment:\n  YOCO_WEBHOOK_SECRET="${data.secret}"\n`);
  } else {
    console.log("  Response:", JSON.stringify(data, null, 2));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
