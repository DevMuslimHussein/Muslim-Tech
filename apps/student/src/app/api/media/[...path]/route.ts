import { cookies } from "next/headers";
import { apiUrl } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("mt_access")?.value;

  if (!accessToken) {
    return new Response(JSON.stringify({ message: "غير مصرح" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl(`/${path.join("/")}`), { headers });
  } catch {
    return new Response(JSON.stringify({ message: "تعذّر الاتصال بالخادم" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const responseHeaders = new Headers();
  for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "content-disposition"]) {
    const value = upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
