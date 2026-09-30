import * as XLSX from "xlsx";
import { createHash } from "node:crypto";
import { contentFingerprint } from "./index";

export interface ParsedExcelListing {
  title: string;
  summary: string;
  location: string;
  city: string;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
  bhk: string | null;
  accommodationType: "flatmates" | "rent" | "lease" | null;
  furnishing: "fully_furnished" | "semi_furnished" | "unfurnished" | null;
  mediaUrls: string[];
  contactUrl: string | null;
  externalId: string;
  raw: Record<string, unknown>;
}

export interface ExcelParseResult {
  validRows: ParsedExcelListing[];
  errors: string[];
  totalRows: number;
}

const TEMPLATE_HEADERS = [
  "Title",
  "Locality",
  "City",
  "Rent",
  "Rent Max",
  "BHK",
  "Accommodation Type",
  "Furnishing",
  "Description",
  "Contact / Listing URL",
  "Media URLs",
];

const SAMPLE_LISTINGS = [
  {
    Title: "Spacious 2BHK in Kondapur for Male Flatmate",
    Locality: "Kondapur",
    City: "Hyderabad",
    Rent: 16000,
    "Rent Max": "",
    BHK: "2",
    "Accommodation Type": "flatmates",
    Furnishing: "semi_furnished",
    Description:
      "Looking for 1 male flatmate in a semi-furnished 2BHK flat near Botanical Garden. Private room with attached washroom, modular kitchen, high-speed WiFi, and cook available.",
    "Contact / Listing URL": "https://wa.me/919876543210",
    "Media URLs": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
  },
  {
    Title: "Full 3BHK Apartment for Rent in Gachibowli",
    Locality: "Gachibowli",
    City: "Hyderabad",
    Rent: 45000,
    "Rent Max": 50000,
    BHK: "3",
    "Accommodation Type": "rent",
    Furnishing: "fully_furnished",
    Description:
      "Spacious 3BHK flat in a gated society near DLF Cybercity. 24/7 security, power backup, clubhouse, and covered car parking included.",
    "Contact / Listing URL": "https://vouchins.com",
    "Media URLs": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
  },
  {
    Title: "Private Room in 3BHK for Female Flatmate in Hitec City",
    Locality: "Hitec City",
    City: "Hyderabad",
    Rent: 18000,
    "Rent Max": "",
    BHK: "3",
    "Accommodation Type": "flatmates",
    Furnishing: "fully_furnished",
    Description:
      "Private room in a 3BHK apartment for female working professional. Walking distance to Metro station, fully setup kitchen, high-speed WiFi.",
    "Contact / Listing URL": "",
    "Media URLs": "",
  },
];

const GUIDE_DATA = [
  {
    "Column Name": "Title",
    Required: "Yes",
    "Allowed Values / Format": "Text (e.g. Spacious 2BHK in Kondapur)",
    Notes: "A descriptive heading for the listing",
  },
  {
    "Column Name": "Locality",
    Required: "Yes",
    "Allowed Values / Format": "Area name (e.g. Kondapur, Gachibowli, Madhapur)",
    Notes: "Neighborhood or locality in the city",
  },
  {
    "Column Name": "City",
    Required: "No",
    "Allowed Values / Format": "City name (e.g. Hyderabad, Bangalore)",
    Notes: "Defaults to Hyderabad if left blank",
  },
  {
    "Column Name": "Rent",
    Required: "Yes",
    "Allowed Values / Format": "Number or amount (e.g. 15000 or 15k)",
    Notes: "Monthly rent in INR",
  },
  {
    "Column Name": "Rent Max",
    Required: "No",
    "Allowed Values / Format": "Number (e.g. 18000)",
    Notes: "Maximum rent if listing has a price range",
  },
  {
    "Column Name": "BHK",
    Required: "No",
    "Allowed Values / Format": "1, 2, 3, 4, 1RK",
    Notes: "Number of bedrooms / configuration",
  },
  {
    "Column Name": "Accommodation Type",
    Required: "No",
    "Allowed Values / Format": "flatmates, rent, lease",
    Notes: "Category of accommodation",
  },
  {
    "Column Name": "Furnishing",
    Required: "No",
    "Allowed Values / Format": "fully_furnished, semi_furnished, unfurnished",
    Notes: "Furnishing status",
  },
  {
    "Column Name": "Description",
    Required: "No",
    "Allowed Values / Format": "Full post text / details",
    Notes: "Amenities, flat rules, food preferences, etc.",
  },
  {
    "Column Name": "Contact / Listing URL",
    Required: "No",
    "Allowed Values / Format": "URL or WhatsApp link",
    Notes: "Link to contact or original post",
  },
  {
    "Column Name": "Media URLs",
    Required: "No",
    "Allowed Values / Format": "Comma-separated HTTPS image URLs",
    Notes: "Publicly accessible image links",
  },
];

/**
 * Generates an Excel (.xlsx) buffer with sample data and guide instructions.
 */
export function generateExcelTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new();

  const wsListings = XLSX.utils.json_to_sheet(SAMPLE_LISTINGS, {
    header: TEMPLATE_HEADERS,
  });
  wsListings["!cols"] = [
    { wch: 38 }, // Title
    { wch: 20 }, // Locality
    { wch: 14 }, // City
    { wch: 12 }, // Rent
    { wch: 12 }, // Rent Max
    { wch: 8 },  // BHK
    { wch: 20 }, // Accommodation Type
    { wch: 18 }, // Furnishing
    { wch: 55 }, // Description
    { wch: 32 }, // Contact / Listing URL
    { wch: 45 }, // Media URLs
  ];
  XLSX.utils.book_append_sheet(wb, wsListings, "Listings");

  const wsGuide = XLSX.utils.json_to_sheet(GUIDE_DATA);
  wsGuide["!cols"] = [
    { wch: 24 },
    { wch: 10 },
    { wch: 38 },
    { wch: 48 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGuide, "Guide & Instructions");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Uint8Array(buffer);
}

/**
 * Generates a CSV template string.
 */
export function generateCsvTemplate(): string {
  const wb = XLSX.utils.book_new();
  const wsListings = XLSX.utils.json_to_sheet(SAMPLE_LISTINGS, {
    header: TEMPLATE_HEADERS,
  });
  return XLSX.utils.sheet_to_csv(wsListings);
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getColumnValue(row: Record<string, unknown>, aliases: string[]): string {
  const normalizedAliases = aliases.map(normalizeKey);
  for (const [k, v] of Object.entries(row)) {
    if (normalizedAliases.includes(normalizeKey(k)) && v !== undefined && v !== null) {
      return String(v).trim();
    }
  }
  return "";
}

function parseRentNumber(val: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/,/g, "").trim().toLowerCase();
  const kMatch = cleaned.match(/([\d.]+)\s*k\b/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1]) * 1000;
    return isNaN(num) ? null : Math.round(num);
  }
  const numericMatch = cleaned.match(/\d+/);
  if (numericMatch) {
    const num = parseInt(numericMatch[0], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

function parseBhk(val: string): string | null {
  if (!val) return null;
  const cleaned = val.toLowerCase().trim();
  if (/1\s*rk/i.test(cleaned)) return "1RK";
  const match = cleaned.match(/([1-9])\s*(bhk|bed|bedroom)?/i);
  return match ? match[1] : null;
}

function parseAccommodationType(val: string): "flatmates" | "rent" | "lease" | null {
  if (!val) return null;
  const cleaned = val.toLowerCase().trim();
  if (/flatmate|roommate|shared|sharing|private room/i.test(cleaned)) return "flatmates";
  if (/rent|rental|entire|full flat|whole flat/i.test(cleaned)) return "rent";
  if (/lease/i.test(cleaned)) return "lease";
  return null;
}

function parseFurnishing(val: string): "fully_furnished" | "semi_furnished" | "unfurnished" | null {
  if (!val) return null;
  const cleaned = val.toLowerCase().replace(/[_-]/g, " ").trim();
  if (/semi/i.test(cleaned)) return "semi_furnished";
  if (/fully|full/i.test(cleaned)) return "fully_furnished";
  if (/unfurnished|bare/i.test(cleaned)) return "unfurnished";
  return null;
}

function parseMediaUrls(val: string): string[] {
  if (!val) return [];
  return val
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV buffer into normalized listing rows.
 */
export function parseExcelRows(fileBuffer: Buffer | Uint8Array | ArrayBuffer): ExcelParseResult {
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  if (!wb.SheetNames.length) {
    return { validRows: [], errors: ["Uploaded file contains no worksheets"], totalRows: 0 };
  }

  // Choose sheet named 'Listings' if present, otherwise first sheet
  const sheetName =
    wb.SheetNames.find((name) => /listing/i.test(name)) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    return { validRows: [], errors: ["Worksheet could not be read"], totalRows: 0 };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const validRows: ParsedExcelListing[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Row 1 is header

    // Check if the entire row is empty
    const values = Object.values(row).map((v) => String(v).trim()).filter(Boolean);
    if (!values.length) return;

    const title = getColumnValue(row, ["Title", "Heading", "Listing Title", "Name", "Post Title"]);
    const locality = getColumnValue(row, [
      "Locality",
      "Location",
      "Area",
      "Neighborhood",
      "Sub Locality",
      "Society",
    ]);
    const cityRaw = getColumnValue(row, ["City", "City Name", "District"]);
    const city = cityRaw || "Hyderabad";

    const rentRaw = getColumnValue(row, ["Rent", "Price", "Rent Min", "Budget", "Price Min", "Cost"]);
    const rentMaxRaw = getColumnValue(row, ["Rent Max", "Price Max", "Max Rent", "Budget Max"]);

    const bhkRaw = getColumnValue(row, ["BHK", "Bedrooms", "Room Type", "Bed", "Rooms"]);
    const accommodationTypeRaw = getColumnValue(row, [
      "Accommodation Type",
      "Type",
      "Category",
      "Listing Type",
    ]);
    const furnishingRaw = getColumnValue(row, ["Furnishing", "Furnish", "Furnished", "Furnishing Status"]);
    const description = getColumnValue(row, [
      "Description",
      "Summary",
      "Details",
      "Text",
      "Content",
      "Post Text",
    ]);
    const contactUrl = getColumnValue(row, [
      "Contact / Listing URL",
      "Contact",
      "Listing URL",
      "URL",
      "Link",
      "Phone",
      "WhatsApp",
    ]);
    const mediaUrlsRaw = getColumnValue(row, ["Media URLs", "Images", "Photos", "Image URLs", "Media"]);

    // Validation
    if (!title && !description) {
      errors.push(`Row ${rowNumber}: Missing Title or Description.`);
      return;
    }
    if (!locality) {
      errors.push(`Row ${rowNumber}: Missing Locality / Location.`);
      return;
    }

    const priceMin = parseRentNumber(rentRaw);
    let priceMax = parseRentNumber(rentMaxRaw);
    if (priceMax !== null && priceMin !== null && priceMax < priceMin) {
      // Swap if max is lower than min
      priceMax = priceMin;
    }

    const finalTitle = title || description.slice(0, 100);
    const finalSummary = description || title;
    const bhk = parseBhk(bhkRaw) || parseBhk(finalTitle) || null;
    const accommodationType =
      parseAccommodationType(accommodationTypeRaw) ||
      parseAccommodationType(finalTitle + " " + finalSummary) ||
      "flatmates";
    const furnishing = parseFurnishing(furnishingRaw) || parseFurnishing(finalSummary);
    const mediaUrls = parseMediaUrls(mediaUrlsRaw);

    // Compute unique externalId & fingerprint
    const seed = `${finalTitle}-${locality}-${priceMin || 0}-${rowNumber}`;
    const hash = createHash("md5").update(seed).digest("hex").slice(0, 12);
    const externalId = `excel-${Date.now()}-${hash}`;

    validRows.push({
      title: finalTitle,
      summary: finalSummary,
      location: locality,
      city,
      priceMin,
      priceMax,
      currency: "INR",
      bhk,
      accommodationType,
      furnishing,
      mediaUrls,
      contactUrl: contactUrl || null,
      externalId,
      raw: row,
    });
  });

  return {
    validRows,
    errors,
    totalRows: rawRows.length,
  };
}
