// Netlify Function: search Google Places for a category+area, keep only
// businesses with no website, and save new ones into Supabase.
//
// GET /.netlify/functions/discover-leads?category=hotels&area=Mbarara

const { searchPlaces, filterNoWebsite } = require("../../src/places");
const { placesToLeadRows, upsertLeads } = require("../../src/leads");
const { getServiceClient } = require("../../src/supabaseClient");

exports.handler = async (event) => {
  const category = event.queryStringParameters?.category;
  const area = event.queryStringParameters?.area;
  const defaultCountry = process.env.DEFAULT_COUNTRY || "UG";

  if (!category || !area) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Both 'category' and 'area' parameters are required.",
      }),
    };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured." }),
    };
  }

  // Always search with category + area combined -- Google has no separate
  // "location" field on this endpoint, so the area MUST be part of the
  // search text itself or results aren't scoped to it at all.
  const searchQuery = `${category} in ${area}`;

  try {
    const places = await searchPlaces(searchQuery, apiKey);
    const noWebsite = filterNoWebsite(places);
    const rows = placesToLeadRows(noWebsite, {
      categoryQuery: category,
      area,
      defaultCountry,
    });

    const supabase = getServiceClient();
    const saved = await upsertLeads(supabase, rows);

    return {
      statusCode: 200,
      body: JSON.stringify({
        searchQuery,
        totalFound: places.length,
        noWebsite: noWebsite.length,
        newlySaved: saved.length,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
