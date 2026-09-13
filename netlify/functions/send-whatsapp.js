// Netlify Function: send the approved WhatsApp template to pending leads.
// Sending doubles as the WhatsApp check -- there's no separate "is this
// number on WhatsApp" endpoint on the Cloud API, so an "invalid recipient"
// error is what tells us a number isn't on WhatsApp.
//
// GET /.netlify/functions/send-whatsapp?limit=10

const { getServiceClient } = require("../../src/supabaseClient");
const { sendTemplateMessage } = require("../../src/whatsapp");
const {
  getPendingLeads,
  markSent,
  markFailed,
  markNotOnWhatsapp,
} = require("../../src/leads");

// Meta error code for "message undeliverable" -- the standard signal that
// the recipient number isn't a valid WhatsApp user.
const NOT_ON_WHATSAPP_CODES = new Set([131026]);

exports.handler = async (event) => {
  const limit = Number(event.queryStringParameters?.limit || 10);

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANG || "en_US";

  if (!phoneNumberId || !accessToken || !templateName) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Missing WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN / WHATSAPP_TEMPLATE_NAME env vars.",
      }),
    };
  }

  const supabase = getServiceClient();
  const leads = await getPendingLeads(supabase, limit);
  const results = [];

  for (const lead of leads) {
    if (!lead.phone_e164) {
      await markFailed(supabase, lead.id, "No phone number on file.");
      results.push({ id: lead.id, status: "failed", reason: "no_phone" });
      continue;
    }

    const components = [
      {
        type: "body",
        parameters: [{ type: "text", text: lead.business_name || "there" }],
      },
    ];

    const { ok, data } = await sendTemplateMessage({
      phoneNumberId,
      accessToken,
      to: lead.phone_e164,
      templateName,
      languageCode,
      components,
    });

    if (ok) {
      await markSent(supabase, lead.id);
      results.push({ id: lead.id, status: "sent" });
    } else {
      const code = data?.error?.code;
      const message = data?.error?.message || JSON.stringify(data);

      if (NOT_ON_WHATSAPP_CODES.has(code)) {
        await markNotOnWhatsapp(supabase, lead.id, message);
        results.push({ id: lead.id, status: "not_on_whatsapp" });
      } else {
        await markFailed(supabase, lead.id, message);
        results.push({ id: lead.id, status: "failed", reason: message });
      }
    }

    // Gentle pacing between sends.
    await new Promise((r) => setTimeout(r, 1000));
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ processed: results.length, results }),
  };
};
