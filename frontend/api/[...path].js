module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const backendUrl = process.env.RENDER_API_URL;
  if (!backendUrl) {
    return res.status(500).json({ message: "RENDER_API_URL is not configured" });
  }

  try {
    const baseUrl = new URL(`${backendUrl.replace(/\/+$/, "")}/`);
    const upstreamUrl = new URL(req.url, baseUrl);
    if (upstreamUrl.origin !== baseUrl.origin || !upstreamUrl.pathname.startsWith("/api/")) {
      return res.status(400).json({ message: "Invalid API request path" });
    }

    const upstream = await fetch(upstreamUrl, {
      headers: { accept: req.headers.accept || "application/json" },
    });

    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    res.setHeader("Cache-Control", "no-store");
    return res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("Backend proxy error:", error);
    return res.status(502).json({ message: "Unable to reach the weather service" });
  }
};
