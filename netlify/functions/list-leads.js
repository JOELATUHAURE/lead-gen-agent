// Netlify Function: list saved leads for the admin dashboard.
// GET /.netlify/functions/list-leads?area=Mbarara&message_status=pending&limit=50

const { getServiceClient } = require("../../src/supabaseClient");

exports.handler = async (event) => {
  const { area, message_status, whatsapp_status } =
    event.queryStringParameters || {};
  const limit = Number(event.queryStringParameters?.limit || 50);

  try {
    const supabase = getServiceClient();
    let query = supabase
      .from("leads")
      .select(
        "id, business_name, formatted_address, phone_e164, area, category_query, whatsapp_status, message_status, message_error, created_at, sent_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (area) query = query.eq("area", area);
    if (message_status) query = query.eq("message_status", message_status);
    if (whatsapp_status) query = query.eq("whatsapp_status", whatsapp_status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return { statusCode: 200, body: JSON.stringify({ leads: data }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
