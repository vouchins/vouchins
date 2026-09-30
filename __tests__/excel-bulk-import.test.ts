import * as XLSX from "xlsx";
import {
  generateCsvTemplate,
  generateExcelTemplate,
  parseExcelRows,
} from "@/lib/content-importer/excel";

describe("Excel Bulk Import Utility", () => {
  describe("generateExcelTemplate", () => {
    it("generates a valid .xlsx buffer with Listings and Guide sheets", () => {
      const buffer = generateExcelTemplate();
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(1000);

      const wb = XLSX.read(buffer, { type: "buffer" });
      expect(wb.SheetNames).toContain("Listings");
      expect(wb.SheetNames).toContain("Guide & Instructions");

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Listings"]);
      expect(rows.length).toBe(3);
      expect(rows[0]).toHaveProperty("Title");
      expect(rows[0]).toHaveProperty("Locality");
      expect(rows[0]).toHaveProperty("Rent");
    });
  });

  describe("generateCsvTemplate", () => {
    it("generates a valid CSV string containing header columns", () => {
      const csv = generateCsvTemplate();
      expect(typeof csv).toBe("string");
      expect(csv).toContain("Title");
      expect(csv).toContain("Locality");
      expect(csv).toContain("Rent");
      expect(csv).toContain("Kondapur");
    });
  });

  describe("parseExcelRows", () => {
    it("parses valid rows from an Excel workbook buffer", () => {
      const rows = [
        {
          Title: "2BHK in Madhapur for 2 Flatmates",
          Locality: "Madhapur",
          City: "Hyderabad",
          Rent: "22000",
          "Rent Max": "25000",
          BHK: "2 BHK",
          "Accommodation Type": "flatmates",
          Furnishing: "fully_furnished",
          Description: "Spacious 2BHK flat near Cyber Towers with all amenities.",
          "Contact / Listing URL": "https://wa.me/919999999999",
          "Media URLs": "https://example.com/flat1.jpg, https://example.com/flat2.jpg",
        },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Listings");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const result = parseExcelRows(buffer);
      expect(result.errors).toHaveLength(0);
      expect(result.validRows).toHaveLength(1);

      const listing = result.validRows[0];
      expect(listing.title).toBe("2BHK in Madhapur for 2 Flatmates");
      expect(listing.location).toBe("Madhapur");
      expect(listing.city).toBe("Hyderabad");
      expect(listing.priceMin).toBe(22000);
      expect(listing.priceMax).toBe(25000);
      expect(listing.bhk).toBe("2");
      expect(listing.accommodationType).toBe("flatmates");
      expect(listing.furnishing).toBe("fully_furnished");
      expect(listing.mediaUrls).toEqual([
        "https://example.com/flat1.jpg",
        "https://example.com/flat2.jpg",
      ]);
      expect(listing.contactUrl).toBe("https://wa.me/919999999999");
    });

    it("supports flexible column aliases and case variations", () => {
      const rows = [
        {
          heading: "Luxury 3BHK Apartment",
          area: "Gachibowli",
          budget: "45k",
          bedrooms: "3",
          category: "rent",
          furnish: "semi-furnished",
          details: "Gated community apartment",
        },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const result = parseExcelRows(buffer);
      expect(result.errors).toHaveLength(0);
      expect(result.validRows).toHaveLength(1);

      const listing = result.validRows[0];
      expect(listing.title).toBe("Luxury 3BHK Apartment");
      expect(listing.location).toBe("Gachibowli");
      expect(listing.city).toBe("Hyderabad"); // Default
      expect(listing.priceMin).toBe(45000);
      expect(listing.bhk).toBe("3");
      expect(listing.accommodationType).toBe("rent");
      expect(listing.furnishing).toBe("semi_furnished");
    });

    it("parses CSV buffers correctly", () => {
      const csv =
        "Title,Locality,Rent,BHK\n" +
        "Cozy Room in Kokapet,Kokapet,14000,1\n";
      const buffer = Buffer.from(csv, "utf-8");

      const result = parseExcelRows(buffer);
      expect(result.errors).toHaveLength(0);
      expect(result.validRows).toHaveLength(1);
      expect(result.validRows[0].title).toBe("Cozy Room in Kokapet");
      expect(result.validRows[0].location).toBe("Kokapet");
      expect(result.validRows[0].priceMin).toBe(14000);
    });

    it("reports row-specific validation errors for missing required fields", () => {
      const rows = [
        { Title: "", Locality: "Kondapur" }, // Missing title & description
        { Title: "Valid 1BHK", Locality: "" }, // Missing locality
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Listings");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const result = parseExcelRows(buffer);
      expect(result.validRows).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain("Row 2: Missing Title");
      expect(result.errors[1]).toContain("Row 3: Missing Locality");
    });
  });
});
