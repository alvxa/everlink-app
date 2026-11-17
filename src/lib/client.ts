export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: Record<string, string[]>;
  constructor(message: string, status: number, code?: string, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Json = Record<string, unknown> | unknown[] | null;

export async function apiFetch<T = unknown>(
  input: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(input, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { message?: string; code?: string; details?: Record<string, string[]> } })
    | null;
  if (!res.ok) {
    throw new ApiClientError(
      data?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      data?.error?.code,
      data?.error?.details
    );
  }
  return data as T;
}

export async function apiUpload<T = unknown>(url: string, formData: FormData, method = "POST"): Promise<T> {
  const res = await fetch(url, { method, body: formData });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiClientError(data?.error?.message ?? "Upload failed", res.status, data?.error?.code);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export type { Json };
