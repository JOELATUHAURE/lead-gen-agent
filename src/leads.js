const { toE164 } = require("./phone");

function placesToLeadRows(places, { categoryQuery, area, defaultCountry }) {
  return places.map((p) => ({
    place_id: p.id,
    business_name: p.displayName?.text || null,
    formatted_address: p.formattedAddress || null,
    phone_e164: toE164(
      p.nationalPhoneNumber || p.internationalPhoneNumber,
      defaultCountry
    ),
    category_query: categoryQuery,
    area: area || null,
    has_website: false,
  }));
}

// Insert new leads, ignoring ones we've already seen (by place_id).
// Never overwrites whatsapp_status/message_status on an existing lead.
async function upsertLeads(supabase, rows) {
  const { data, error } = await supabase
    .from("leads")
    .upsert(rows, { onConflict: "place_id", ignoreDuplicates: true })
    .select();

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return data;
}

module.exports = { placesToLeadRows, upsertLeads };
