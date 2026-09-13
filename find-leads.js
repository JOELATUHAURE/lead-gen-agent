// Find business leads using the Google Places API (New) Text Search endpoint.
// Saves all results to a local CSV, and (if Supabase env vars are set)
// upserts the no-website ones into the `leads` table for the WhatsApp pipeline.
//
// Usage: node find-leads.js "hardware shops in Mbarara" [area]

require("dotenv").config();
const fs = require("fs");
const path = require("path");

const { searchPlaces, filterNoWebsite } = require("./src/places");
const { placesToLeadRows, upsertLeads } = require("./src/leads");
const { getServiceClient } = require("./src/supabaseClient");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

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
  const args = process.argv.slice(2);
  const area = args.length > 1 ? args[args.length - 1] : undefined;
  const query = (area ? args.slice(0, -1) : args).join(" ") || args.join(" ");

  if (!process.argv.slice(2).join(" ")) {
    console.error(
      'Usage: node find-leads.js "hardware shops in Mbarara" [area]'
    );
    process.exit(1);
  }

  if (!API_KEY) {
    console.error(
      "Missing GOOGLE_PLACES_API_KEY. Copy .env.example to .env and add your key."
    );
    process.exit(1);
  }

  const fullQuery = process.argv.slice(2).join(" ");
  console.log(`Searching: "${fullQuery}"...`);

  const places = await searchPlaces(fullQuery, API_KEY);

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

  const filePath = saveCsv(fullQuery, places);
  console.log(`Saved all results to ${filePath}`);

  const noWebsite = filterNoWebsite(places);
  console.log(`\n${noWebsite.length} of ${places.length} have no website listed.`);

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const rows = placesToLeadRows(noWebsite, {
      categoryQuery: fullQuery,
      area,
      defaultCountry: process.env.DEFAULT_COUNTRY || "UG",
    });
    const supabase = getServiceClient();
    const saved = await upsertLeads(supabase, rows);
    console.log(`Saved ${saved.length} new no-website leads to Supabase.`);
  } else {
    console.log(
      "(Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to also save no-website leads to Supabase.)"
    );
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
