// Find business leads using the Google Places API (New) Text Search endpoint.
// Usage: node find-leads.js "hardware shops in Mbarara"

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
].join(",");

async function searchPlaces(query) {
  const results = [];
  let pageToken;

  do {
    const body = { textQuery: query };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Places API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    results.push(...(data.places || []));
    pageToken = data.nextPageToken;

    // Google requires a short delay before a page token becomes valid.
    if (pageToken) await new Promise((r) => setTimeout(r, 2000));
  } while (pageToken && results.length < 60);

  return results;
}

function toCsvRow(values) {
  return values
    .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
    .join(",");
}

function saveCsv(query, places) {
  const header = [
    "name",
    "address",
    "phone",
    "website",
    "rating",
    "reviews",
    "status",
    "place_id",
  ];

  const rows = places.map((p) =>
    toCsvRow([
      p.displayName?.text,
      p.formattedAddress,
      p.nationalPhoneNumber || p.internationalPhoneNumber,
      p.websiteUri,
      p.rating,
      p.userRatingCount,
      p.businessStatus,
      p.id,
    ])
  );

  const csv = [toCsvRow(header), ...rows].join("\n");

  const outDir = path.join(__dirname, "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const safeName = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
  const filePath = path.join(outDir, `${safeName}.csv`);
  fs.writeFileSync(filePath, csv, "utf8");

  return filePath;
}

async function main() {
  const query = process.argv.slice(2).join(" ");

  if (!query) {
    console.error('Usage: node find-leads.js "hardware shops in Mbarara"');
    process.exit(1);
  }

  if (!API_KEY) {
    console.error(
      "Missing GOOGLE_PLACES_API_KEY. Copy .env.example to .env and add your key."
    );
    process.exit(1);
  }

  console.log(`Searching: "${query}"...`);

  const places = await searchPlaces(query);

  if (places.length === 0) {
    console.log("No results found.");
    return;
  }

  console.log(`Found ${places.length} businesses:\n`);
  for (const p of places) {
    console.log(`- ${p.displayName?.text || "(no name)"}`);
    console.log(`  Address: ${p.formattedAddress || "n/a"}`);
    console.log(
      `  Phone: ${p.nationalPhoneNumber || p.internationalPhoneNumber || "n/a"}`
    );
    console.log(`  Website: ${p.websiteUri || "n/a"}`);
    console.log(`  Rating: ${p.rating ?? "n/a"} (${p.userRatingCount ?? 0} reviews)`);
    console.log("");
  }

  const filePath = saveCsv(query, places);
  console.log(`Saved results to ${filePath}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
