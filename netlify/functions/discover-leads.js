// Netlify Function: search Google Places for a category+area, keep only
// businesses with no website, and save new ones into Supabase.
//
// GET /.netlify/functions/discover-leads?query=hardware%20shops%20in%20Mbarara&area=Mbarara

const { searchPlaces, filterNoWebsite } = require("../../src/places");
const { placesToLeadRows, upsertLeads } = require("../../src/leads");
const { getServiceClient } = require("../../src/supabaseClient");

exports.handler = async (event) => {
  const query = event.queryStringParameters?.query;
  const area = event.queryStringParameters?.area;
  const defaultCountry = process.env.DEFAULT_COUNTRY || "UG";

  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required 'query' parameter." }),
    };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured." }),
    };
  }

  try {
    const places = await searchPlaces(query, apiKey);
    const noWebsite = filterNoWebsite(places);
    const rows = placesToLeadRows(noWebsite, {
      categoryQuery: query,
      area,
      defaultCountry,
    });

    const supabase = getServiceClient();
    const saved = await upsertLeads(supabase, rows);

    return {
      statusCode: 200,
      body: JSON.stringify({
        query,
        totalFound: places.length,
        noWebsite: noWebsite.length,
        newlySaved: saved.length,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
