function isValidEmail(email: string) {
  // pragmatic (not exhaustive) email check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function postJsonWithManualRedirects(url: string, payload: string) {
  // Apps Script Web Apps often reply with a 302 to a script.googleusercontent.com URL.
  // For 301/302/303, browsers typically change POST -> GET; importantly, the script execution
  // already happened on the initial POST, and the redirect is just to fetch the output.
  // For 307/308, the method/body must be preserved.
  const maxHops = 3;
  let currentUrl = url;
  let lastResponse: Response | null = null;

  for (let hop = 0; hop <= maxHops; hop += 1) {
    const res = await fetch(currentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      cache: "no-store",
      redirect: "manual",
    });

    lastResponse = res;

    if (![301, 302, 303, 307, 308].includes(res.status)) {
      return res;
    }

    const location = res.headers.get("location");
    if (!location) {
      return res;
    }

    // 307/308: repeat POST to the redirected location.
    if (res.status === 307 || res.status === 308) {
      currentUrl = location;
      continue;
    }

    // 301/302/303: follow redirect with GET to fetch the output.
    return fetch(location, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    });
  }

  return lastResponse ?? new Response("Too many redirects", { status: 502 });
}

export async function POST(request: Request) {
  const webhookUrl = process.env.WAITLIST_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json(
      { error: "WAITLIST_WEBHOOK_URL is not set" },
      { status: 500 },
    );
  }

  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const payload = JSON.stringify({ email, source: "mappli.co", ts: Date.now() });
  const upstream = await postJsonWithManualRedirects(webhookUrl, payload);

  const contentType = upstream.headers.get("content-type") ?? "";
  const allow = upstream.headers.get("allow") ?? "";
  const location = upstream.headers.get("location") ?? "";
  const text = await upstream.text().catch(() => "");
  const detail = text.slice(0, 2000);

  if (!upstream.ok) {
    return Response.json(
      {
        error: "Upstream error",
        status: upstream.status,
        contentType,
        allow,
        location,
        detail,
      },
      { status: 502 },
    );
  }

  // Apps Script often returns an HTML error page with HTTP 200 if the handler is missing.
  if (contentType.includes("text/html") || /<html/i.test(text)) {
    return Response.json(
      {
        error: "Upstream returned HTML (likely Apps Script error page)",
        status: upstream.status,
        contentType,
        allow,
        location,
        detail,
        hint:
          upstream.status === 405
            ? "Apps Script is allowing GET/HEAD only. Ensure your Apps Script has a doPost(e) handler and that you re-deploy a new Web App version (Execute as: Me, access: Anyone)."
            : undefined,
      },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
