import { contentFingerprint, normalizeExternalUrl, parseSupportedSource } from "@/lib/content-importer";
import { extractOriginalFacebookUrl, extractRentdRows, rentdAdapter } from "@/lib/content-importer/rentd";
import { flatnestAdapter, flatnestApiUrl } from "@/lib/content-importer/flatnest";

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

  it("accepts only FlatNest's public listings page and maps every supported filter", () => {
    expect(parseSupportedSource("https://flatnest.in/listings?city=Hyderabad").adapter.key).toBe("flatnest");
    expect(() => parseSupportedSource("https://api.flatnest.in/api/listings")).toThrow("not supported");
    expect(() => parseSupportedSource("https://flatnest.in/auth/login")).toThrow("not supported");
    const api = flatnestApiUrl(new URL("https://flatnest.in/listings?locality=Kondapur&roomTypes=2_bhk_flat,3_bhk_flat&budget=30000&foodChoice=veg&amenities=WiFi&sort=newest"), 2);
    expect(api.hostname).toBe("api.flatnest.in");
    expect(api.searchParams.get("page")).toBe("2");
    expect(api.searchParams.getAll("roomTypes")).toEqual(["2_bhk_flat", "3_bhk_flat"]);
    expect(api.searchParams.get("localities")).toBe("Kondapur");
    expect(api.searchParams.get("maxRent")).toBe("30000");
    expect(api.searchParams.get("foodPreference")).toBe("veg");
    expect(api.searchParams.get("type")).toBe("offering");
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

  it("imports public FlatNest offerings, strips private fields, and paginates from zero", async () => {
    const fetchMock = jest.fn(async (input: URL | RequestInfo) => {
      const page = new URL(String(input)).searchParams.get("page");
      const body = JSON.stringify({ listings: [{ id: `flat-${page}`, status: "active", type: "offering", title: "Room", description: "Full description", locality: "Kondapur", city: "Hyderabad", rent: 15000, room_type: "single", furnishing: "furnished", created_at: "2026-08-01T00:00:00Z", whatsapp_number: "secret", posted_by: { name: "Private" }, listing_photos: [{ url: "https://res.cloudinary.com/example/image.jpg" }] }] });
      return { ok: true, status: 200, headers: { get: () => String(body.length) }, text: async () => body } as unknown as Response;
    });
    Object.defineProperty(global, "fetch", { value: fetchMock, configurable: true });
    const sourceUrl = new URL("https://flatnest.in/listings?city=Hyderabad");
    const first = await flatnestAdapter.fetch(sourceUrl, "latest", { page: 8 });
    expect(first.cursor).toEqual({ page: 0 });
    expect(first.items[0]).toMatchObject({ externalId: "flat-0", summary: "Full description", accommodationType: "single", priceMin: 15000 });
    expect(first.items[0].raw).not.toHaveProperty("whatsapp_number");
    expect(first.items[0].raw).not.toHaveProperty("posted_by");
    await expect(flatnestAdapter.fetch(sourceUrl, "more", { page: 0 })).resolves.toMatchObject({ cursor: { page: 1 } });
  });
});
