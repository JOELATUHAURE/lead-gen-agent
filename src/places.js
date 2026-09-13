// Google Places API (New) Text Search — shared by the CLI script and the Netlify function.

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

async function searchPlaces(query, apiKey) {
  const results = [];
  let pageToken;

  do {
    const body = { textQuery: query };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
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

function filterNoWebsite(places) {
  return places.filter((p) => !p.websiteUri);
}

module.exports = { searchPlaces, filterNoWebsite };
