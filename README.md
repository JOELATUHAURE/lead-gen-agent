# lead-gen-agent

Finds businesses on Google (via the Places API) in a chosen area, keeps only
the ones with **no website**, and sends them an outreach message via the
WhatsApp Cloud API. Sending doubles as the WhatsApp check — the Cloud API
has no separate "is this number on WhatsApp" endpoint, so an "invalid
recipient" error on send is what tells us a number isn't on WhatsApp.

## Architecture

- **Google Places API (New)** — business discovery + no-website filtering
- **Supabase** — `leads` table tracking each lead through
  `discovered → messaged (sent / failed / not on WhatsApp)`
- **Netlify Functions** — serverless endpoints for each pipeline stage
- **GitHub** — source control, auto-deploys to Netlify on push
- **WhatsApp Cloud API** (Meta) — sending the outreach template message

## Setup

1. Install [Node.js](https://nodejs.org/) v18+ (needs built-in `fetch`).
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in:
   - `GOOGLE_PLACES_API_KEY` — from Google Cloud Console (Places API (New)
     enabled, billing attached, key restricted to that API)
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase
     project's Settings > API (service role key, not the public anon key —
     keep this secret, it bypasses row-level security)
   - `DEFAULT_COUNTRY` — ISO country code used to normalize phone numbers to
     E.164 (defaults to `UG`)
   - `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID` /
     `WHATSAPP_ACCESS_TOKEN` — from Meta for Developers > your app >
     WhatsApp > API Setup
   - `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANG` — the approved
     message template to send (Meta rejects freeform text to a number that
     hasn't messaged you first)

## Usage (local / manual)

```bash
node find-leads.js "hardware shops in Mbarara" Mbarara
```

Prints results, saves everything to a CSV in `output/`, and — if the
Supabase env vars are set — upserts the no-website leads into the `leads`
table (deduplicated by Google's `place_id`).

## Usage (Netlify functions)

Once the site is deployed with the right environment variables set:

```
GET /.netlify/functions/discover-leads?query=hardware%20shops%20in%20Mbarara&area=Mbarara
```

Search + filter + save to Supabase. Returns a JSON summary of how many were
found, how many had no website, and how many were newly saved.

```
GET /.netlify/functions/send-whatsapp?limit=10
```

Sends the approved template to up to `limit` leads with `message_status =
'pending'`, one at a time with a short pacing delay between each. Updates
each lead's `whatsapp_status` (`on_whatsapp` / `not_on_whatsapp`) and
`message_status` (`sent` / `failed` / `skipped`) based on the result.

## Pipeline stages

1. `discover-leads` (done) — search + filter + save to Supabase
2. `send-whatsapp` (done) — send the approved template to pending leads;
   Meta's response tells us whether the number is on WhatsApp

## Required Netlify environment variables

Set these in Site settings > Environment variables (never commit them):

- `GOOGLE_PLACES_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEFAULT_COUNTRY` (optional, defaults to `UG`)
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_TEMPLATE_NAME`
- `WHATSAPP_TEMPLATE_LANG` (optional, defaults to `en_US`)
