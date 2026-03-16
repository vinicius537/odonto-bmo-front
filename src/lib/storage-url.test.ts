import { describe, expect, it } from "vitest";

import { resolveBrowserStorageUrl } from "@/lib/storage-url";

describe("storage url helpers", () => {
  it("rewrites internal minio hosts to the browser host", () => {
    expect(resolveBrowserStorageUrl("http://minio:9000/odonto-bmo/file.png")).toBe(
      `http://${window.location.hostname}:9000/odonto-bmo/file.png`,
    );
  });

  it("keeps already reachable urls unchanged", () => {
    expect(resolveBrowserStorageUrl("http://localhost:9000/odonto-bmo/file.png")).toBe(
      "http://localhost:9000/odonto-bmo/file.png",
    );
  });
});
