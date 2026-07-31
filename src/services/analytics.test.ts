import { detectDeviceType, isLikelyBot, normalizeAnalyticsPath } from "@/services/analytics";

describe("analytics", () => {
  it("normalizes tracked paths and removes query parameters", () => {
    expect(normalizeAnalyticsPath("/category/doctor/?utm_source=test")).toBe("/category/doctor");
    expect(normalizeAnalyticsPath("invalid")).toBe("/");
    expect(normalizeAnalyticsPath("")).toBe("/");
  });

  it("detects common device types", () => {
    expect(detectDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile")).toBe("mobile");
    expect(detectDeviceType("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(detectDeviceType("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(detectDeviceType("")).toBe("other");
  });

  it("filters common crawler user agents", () => {
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 Chrome/126.0 Safari/537.36")).toBe(false);
  });
});
