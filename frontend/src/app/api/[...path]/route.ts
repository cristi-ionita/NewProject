import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.INTERNAL_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function buildTargetUrl(path: string[], request: NextRequest): string {
  const normalizedBaseUrl = BACKEND_URL.endsWith("/")
    ? BACKEND_URL.slice(0, -1)
    : BACKEND_URL;

  const normalizedPath = path.join("/");
  const target = new URL(`${normalizedBaseUrl}/${normalizedPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  return target.toString();
}

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const xUserCode = request.headers.get("x-user-code");
  const acceptLanguage = request.headers.get("accept-language");
  const accept = request.headers.get("accept");

  if (authorization) {
    headers.set("authorization", authorization);
  }

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (xUserCode) {
    headers.set("x-user-code", xUserCode);
  }

  if (acceptLanguage) {
    headers.set("accept-language", acceptLanguage);
  }

  if (accept) {
    headers.set("accept", accept);
  }

  return headers;
}

async function buildRequestBody(request: NextRequest): Promise<BodyInit | undefined> {
  if (request.method === "GET" || request.method === "DELETE") {
    return undefined;
  }

  return await request.arrayBuffer();
}

async function forwardRequest(
  request: NextRequest,
  path: string[]
): Promise<Response> {
  const url = buildTargetUrl(path, request);
  const headers = buildForwardHeaders(request);
  const body = await buildRequestBody(request);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
    body,
  };

  try {
    const backendResponse = await fetch(url, init);
    const responseHeaders = new Headers();

    const contentType = backendResponse.headers.get("content-type");
    const contentDisposition = backendResponse.headers.get("content-disposition");

    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition);
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      {
        error: "BAD_GATEWAY",
        code: "errors.gateway.unavailable",
        message: "Backend unavailable.",
      },
      {
        status: 502,
      }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return forwardRequest(request, path);
}