import { contentFingerprint, normalizeExternalUrl, parseSupportedSource } from "@/lib/content-importer";
import { extractOriginalFacebookUrl, extractRentdRows, rentdAdapter } from "@/lib/content-importer/rentd";

describe("content importer", () => {
  afterEach(() => jest.restoreAllMocks());

  it("accepts only the supported HTTPS Rentd host", () => {
    expect(parseSupportedSource("https://rentd.biswanath.me/?city=Hyderabad").adapter.key).toBe("rentd");
    expect(() => parseSupportedSource("http://rentd.biswanath.me")).toThrow("HTTPS");
    expect(() => parseSupportedSource("https://user:pass@rentd.biswanath.me")).toThrow("HTTPS");
    expect(() => parseSupportedSource("https://rentd.biswanath.me:8443")).toThrow("HTTPS");
    expect(() => parseSupportedSource("https://example.com")).toThrow("This source is not supported yet");
    expect(() => parseSupportedSource("https://127.0.0.1")).toThrow("This source is not supported yet");
  });

  it("extracts Rentd payloads and an original Facebook link", () => {
    expect(extractRentdRows('<script>initialListings = [{"_id":"one","title":"Room"}]</script>')).toEqual([{ _id: "one", title: "Room" }]);
    expect(extractOriginalFacebookUrl('<a href="https://www.facebook.com/groups/320/posts/123/">Open Original Listing</a>')).toBe("https://www.facebook.com/groups/320/posts/123/");
    expect(extractOriginalFacebookUrl("<p>Unavailable</p>")).toBeNull();
  });

  it("extracts listings from Rentd's escaped Next.js Flight payload", () => {
    const props = '8:["$","Component",null,{"initialListings":[{"_id":"flight-one","title":"Flight listing"}],"pageSize":24}]';
    const html = `<script>self.__next_f.push(${JSON.stringify([1, props])})</script>`;
    expect(extractRentdRows(html)).toEqual([{ _id: "flight-one", title: "Flight listing" }]);
  });

  it("normalizes tracking URLs and creates stable fallback fingerprints", async () => {
    expect(normalizeExternalUrl("https://facebook.com/groups/1/posts/2/?utm_source=x#comments")).toBe("https://facebook.com/groups/1/posts/2");
    const item = { title: " Room ", summary: "Near Metro", city: "Hyderabad", location: "Gachibowli", priceMin: 10000, priceMax: 12000 };
    expect(contentFingerprint(item)).toBe(contentFingerprint({ ...item, title: "room" }));
  });

  it("uses first page for latest and keeps pagination per source for more", async () => {
    const fetchMock = jest.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      const html = url.includes("/listing/") ? "<p>No original link</p>" : `<script>initialListings = [{"_id":"${new URL(url).searchParams.get("page")}","title":"Listing","summary":"Rental"}]</script>`;
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => html } as unknown as Response;
    });
    Object.defineProperty(global, "fetch", { value: fetchMock, configurable: true });
    const sourceUrl = new URL("https://rentd.biswanath.me/?city=Hyderabad");
    await expect(rentdAdapter.fetch(sourceUrl, "latest", { page: 7 })).resolves.toMatchObject({ cursor: { page: 1 } });
    await expect(rentdAdapter.fetch(sourceUrl, "more", { page: 3 })).resolves.toMatchObject({ cursor: { page: 4 } });
    expect(fetchMock).toHaveBeenCalled();
  });
});
