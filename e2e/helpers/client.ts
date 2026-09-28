export interface RequestOptions {
  ip?: string;
  cookie?: string;
  baseUrl?: string;
}

export interface ApiResponse<T = any> {
  status: number;
  headers: Headers;
  data: T;
  cookieHeader: string;
}

const DEFAULT_BASE_URL = process.env.APP_URL || "http://127.0.0.1:3000";

export async function postJson<T = any>(
  path: string,
  body: Record<string, unknown>,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": options.ip || "203.0.113.195",
  };

  if (options.cookie) {
    headers["Cookie"] = options.cookie;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({} as T));
  const cookieHeader = res.headers.get("set-cookie") || "";

  return {
    status: res.status,
    headers: res.headers,
    data,
    cookieHeader,
  };
}

export async function getJson<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const headers: Record<string, string> = {
    "x-forwarded-for": options.ip || "203.0.113.195",
  };

  if (options.cookie) {
    headers["Cookie"] = options.cookie;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers,
  });

  const data = await res.json().catch(() => ({} as T));
  const cookieHeader = res.headers.get("set-cookie") || "";

  return {
    status: res.status,
    headers: res.headers,
    data,
    cookieHeader,
  };
}
