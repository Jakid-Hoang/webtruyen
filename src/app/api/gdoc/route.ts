import { NextResponse, type NextRequest } from "next/server";
import { parseGoogleDocId } from "@/lib/writing/gdoc-id";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Fetch the HTML export of a Google Doc shared as "anyone with the link".
 * Runs server-side because the browser can't read docs.google.com (CORS).
 * The target host is fixed, so the id is the only user input.
 */
export async function GET(req: NextRequest) {
  const id = parseGoogleDocId(req.nextUrl.searchParams.get("id") ?? "");
  if (!id) return NextResponse.json({ error: "Link Google Docs không hợp lệ." }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(`https://docs.google.com/document/d/${id}/export?format=html`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json({ error: "Không kết nối được tới Google Docs." }, { status: 502 });
  }

  // Private docs redirect to the Google sign-in page instead of returning the export.
  if (res.url.includes("accounts.google.com") || res.status === 401 || res.status === 403) {
    return NextResponse.json(
      { error: "Doc chưa được chia sẻ công khai. Hãy bật “Bất kỳ ai có đường liên kết” hoặc dùng “Liên kết Google Docs”." },
      { status: 403 },
    );
  }
  if (res.status === 404) return NextResponse.json({ error: "Không tìm thấy Doc này." }, { status: 404 });
  if (!res.ok) return NextResponse.json({ error: `Google trả về lỗi ${res.status}.` }, { status: 502 });

  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return NextResponse.json({ error: "Doc quá lớn (giới hạn 10MB)." }, { status: 413 });
  const html = await res.text();
  if (html.length > MAX_BYTES) return NextResponse.json({ error: "Doc quá lớn (giới hạn 10MB)." }, { status: 413 });

  const title = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  return NextResponse.json({ id, title, html }, { headers: { "Cache-Control": "no-store" } });
}
