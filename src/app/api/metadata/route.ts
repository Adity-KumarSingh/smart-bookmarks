import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedUrl: URL | null = null;

  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "SmartBookmarks/1.0 (metadata fetcher)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({
        title: parsedUrl.hostname,
        description: null,
        favicon_url: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
      });
    }

    const html = await response.text();

    const titleMatch =
      html.match(/<meta\s+property="og:title"\s+content="([^"]*?)"/i) ||
      html.match(/<meta\s+content="([^"]*?)"\s+property="og:title"/i) ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch
      ? decodeHtmlEntities(titleMatch[1].trim())
      : parsedUrl.hostname;

    const descMatch =
      html.match(
        /<meta\s+property="og:description"\s+content="([^"]*?)"/i
      ) ||
      html.match(
        /<meta\s+content="([^"]*?)"\s+property="og:description"/i
      ) ||
      html.match(/<meta\s+name="description"\s+content="([^"]*?)"/i) ||
      html.match(/<meta\s+content="([^"]*?)"\s+name="description"/i);
    const description = descMatch
      ? decodeHtmlEntities(descMatch[1].trim()).slice(0, 200)
      : null;

    const favicon_url = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;

    return NextResponse.json({ title, description, favicon_url });
  } catch {
    if (parsedUrl) {
      return NextResponse.json({
        title: parsedUrl.hostname,
        description: null,
        favicon_url: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}
