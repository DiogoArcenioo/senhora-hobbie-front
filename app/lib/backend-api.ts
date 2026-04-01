const DEFAULT_BACKEND_API_URL = "http://localhost:3001";

type BackendErrorPayload = {
  message?: string | string[];
};

export function buildBackendUrl(path: string): string {
  const baseUrl =
    process.env.BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_URL ??
    DEFAULT_BACKEND_API_URL;

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export async function parseBackendPayload(response: Response): Promise<unknown> {
  const body = await response.text();

  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export function getBackendErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const { message } = payload as BackendErrorPayload;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message) && message.length > 0) {
    const firstMessage = message.find((item) => typeof item === "string" && item.trim().length > 0);

    return typeof firstMessage === "string" ? firstMessage : null;
  }

  return null;
}
