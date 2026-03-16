const INTERNAL_STORAGE_HOSTS = new Set(["minio"]);

export function resolveBrowserStorageUrl(value: string | null | undefined) {
  if (!value || typeof window === "undefined") {
    return value ?? "";
  }

  try {
    const url = new URL(value);
    if (!INTERNAL_STORAGE_HOSTS.has(url.hostname.toLowerCase())) {
      return value;
    }

    url.hostname = window.location.hostname || "localhost";
    return url.toString();
  } catch {
    return value;
  }
}

