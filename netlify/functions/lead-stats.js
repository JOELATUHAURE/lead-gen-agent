// Netlify Function: quick counts for the admin dashboard header.
// GET /.netlify/functions/lead-stats

const { getServiceClient } = require("../../src/supabaseClient");

async function countWhere(supabase, column, value) {
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw new Error(error.message);
  return count;
}

exports.handler = async () => {
  try {
    const supabase = getServiceClient();

    const [total, pending, sent, failed, skipped] = await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .then((r) => {
          if (r.error) throw new Error(r.error.message);
          return r.count;
        }),
      countWhere(supabase, "message_status", "pending"),
      countWhere(supabase, "message_status", "sent"),
      countWhere(supabase, "message_status", "failed"),
      countWhere(supabase, "message_status", "skipped"),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ total, pending, sent, failed, skipped }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
