const DEFAULT_BASE_PATH = "/ipl";

function normalizeBasePath(value: string | undefined) {
  const sanitized = (value || "").replace(/"/g, "").trim();

  if (!sanitized) {
    return DEFAULT_BASE_PATH;
  }

  return sanitized.startsWith("/") ? sanitized : `/${sanitized}`;
}

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function withBasePath(path: string) {
  if (!path) {
    return basePath;
  }

  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}
