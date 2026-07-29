// Lightweight fetch wrapper used by client components.
// Handles JSON parsing, error normalisation, and is cookie-friendly (same-origin).

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function apiFetch<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  })

  const ct = res.headers.get("content-type") || ""
  let body: unknown = null
  if (ct.includes("application/json")) {
    body = await res.json().catch(() => null)
  } else if (ct.includes("text/")) {
    body = await res.text().catch(() => null)
  } else {
    body = await res.blob().catch(() => null)
  }

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && typeof (body as Record<string, unknown>).error === "string"
        ? ((body as Record<string, unknown>).error as string)
        : `Permintaan gagal (${res.status})`)
    throw new ApiError(message, res.status, body)
  }
  return body as T
}

// Convenience helpers
export const api = {
  get: <T = unknown>(url: string, init?: RequestInit) =>
    apiFetch<T>(url, { ...init, method: "GET" }),
  post: <T = unknown>(url: string, data?: unknown, init?: RequestInit) =>
    apiFetch<T>(url, { ...init, method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T = unknown>(url: string, data?: unknown, init?: RequestInit) =>
    apiFetch<T>(url, { ...init, method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  put: <T = unknown>(url: string, data?: unknown, init?: RequestInit) =>
    apiFetch<T>(url, { ...init, method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  del: <T = unknown>(url: string, init?: RequestInit) =>
    apiFetch<T>(url, { ...init, method: "DELETE" }),
}
