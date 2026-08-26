import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiUrl } from "@/lib/api";

async function forward(request: Request, path: string[]) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("mt_access")?.value;

  if (!accessToken) {
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  const url = new URL(request.url);
  const target = apiUrl(`/${path.join("/")}${url.search}`);

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${accessToken}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      duplex: hasBody ? "half" : undefined,
    } as RequestInit);
  } catch {
    return NextResponse.json({ message: "تعذّر الاتصال بالخادم، حاول مرة أخرى" }, { status: 502 });
  }

  const responseContentType = upstream.headers.get("content-type") ?? "application/json";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: upstream.status,
    headers: { "Content-Type": responseContentType },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path);
}
