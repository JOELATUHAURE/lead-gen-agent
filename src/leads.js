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

async function getPendingLeads(supabase, limit = 10) {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("message_status", "pending")
    .neq("whatsapp_status", "not_on_whatsapp")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Supabase select failed: ${error.message}`);
  return data;
}

async function markSent(supabase, id) {
  const { error } = await supabase
    .from("leads")
    .update({
      whatsapp_status: "on_whatsapp",
      message_status: "sent",
      sent_at: new Date().toISOString(),
      message_error: null,
    })
    .eq("id", id);

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

async function markFailed(supabase, id, errorMessage) {
  const { error } = await supabase
    .from("leads")
    .update({ message_status: "failed", message_error: errorMessage })
    .eq("id", id);

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

async function markNotOnWhatsapp(supabase, id, errorMessage) {
  const { error } = await supabase
    .from("leads")
    .update({
      whatsapp_status: "not_on_whatsapp",
      message_status: "skipped",
      message_error: errorMessage,
    })
    .eq("id", id);

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

module.exports = {
  placesToLeadRows,
  upsertLeads,
  getPendingLeads,
  markSent,
  markFailed,
  markNotOnWhatsapp,
};
