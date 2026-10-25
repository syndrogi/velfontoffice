// VELFONT OFFICE — Access Gate (Supabase Edge Function)
//
// Server-side password check + signed-token issuance for the client-side
// access gates in shop/js/gate.js and os/js/login.js + os/app/js/boot.js.
// The password and the HMAC signing secret live only in this function's
// environment (GATE_PASSWORD / GATE_HMAC_SECRET), never in page JS, so
// neither can be read from devtools. A token only proves "the server
// accepted a password at some point before this token's exp" — it can't
// be fabricated client-side the way a plain localStorage flag can,
// because forging one requires GATE_HMAC_SECRET.
//
// Deployed twice, once per Supabase project that needs a gate (Founder
// OS's project and Shop's separate project), each with its own
// GATE_PASSWORD/GATE_HMAC_SECRET secrets — the code is identical, only
// the deployed project and its secrets differ.

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signToken(secret: string): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS });
  const payloadB64 = toBase64Url(encoder.encode(payload));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return payloadB64 + "." + toBase64Url(new Uint8Array(sig));
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  if (typeof token !== "string" || token.indexOf(".") === -1) return false;
  const [payloadB64, sigB64] = token.split(".");
  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sigB64),
      encoder.encode(payloadB64),
    );
    if (!valid) return false;
    const payload = JSON.parse(decoder.decode(fromBase64Url(payloadB64)));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

const ALLOWED_ORIGINS = new Set([
  "https://velfontoffice.com",
  "https://www.velfontoffice.com",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://velfontoffice.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method not allowed" }), {
      status: 405,
      headers: { ...headers, "content-type": "application/json" },
    });
  }

  const secret = Deno.env.get("GATE_HMAC_SECRET");
  const password = Deno.env.get("GATE_PASSWORD");
  if (!secret || !password) {
    return new Response(JSON.stringify({ ok: false, error: "gate not configured" }), {
      status: 500,
      headers: { ...headers, "content-type": "application/json" },
    });
  }

  let body: { action?: string; password?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad request" }), {
      status: 400,
      headers: { ...headers, "content-type": "application/json" },
    });
  }

  const respond = (data: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...headers, "content-type": "application/json" },
    });

  if (body.action === "login") {
    if (typeof body.password !== "string" || body.password !== password) {
      return respond({ ok: false }, 401);
    }
    return respond({ ok: true, token: await signToken(secret) });
  }

  if (body.action === "verify") {
    const valid = typeof body.token === "string" && (await verifyToken(body.token, secret));
    return respond({ ok: valid }, valid ? 200 : 401);
  }

  return respond({ ok: false, error: "unknown action" }, 400);
});
