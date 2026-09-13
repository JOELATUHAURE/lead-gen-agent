# lead-gen-agent

Finds businesses on Google (via the Places API) in a chosen area, keeps only
the ones with **no website**, checks whether their phone number is on
WhatsApp, and sends them an outreach message via the WhatsApp Cloud API.

## Architecture

- **Google Places API (New)** — business discovery + no-website filtering
- **Supabase** — `leads` table tracking each lead through
  `discovered → whatsapp checked → messaged`
- **Netlify Functions** — serverless endpoints for each pipeline stage
- **GitHub** — source control, auto-deploys to Netlify on push
- **WhatsApp Cloud API** (Meta) — sending the outreach template message
- A third-party WhatsApp number-checker — the Cloud API has no built-in way
  to check if a number is registered on WhatsApp before sending

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

## Usage (local / manual)

```bash
node find-leads.js "hardware shops in Mbarara" Mbarara
```

Prints results, saves everything to a CSV in `output/`, and — if the
Supabase env vars are set — upserts the no-website leads into the `leads`
table (deduplicated by Google's `place_id`).

## Usage (Netlify function)

Once the site is deployed with the right environment variables set:

```
GET /.netlify/functions/discover-leads?query=hardware%20shops%20in%20Mbarara&area=Mbarara
```

Same behavior as the CLI script, minus the CSV — returns a JSON summary of
how many were found, how many had no website, and how many were newly saved.

## Pipeline stages

1. `discover-leads` (done) — search + filter + save to Supabase
2. `check-whatsapp` (next) — for `whatsapp_status = 'unknown'` leads, call a
   number-checker API and update the status
3. `send-whatsapp` (next) — for `whatsapp_status = 'on_whatsapp'` and
   `message_status = 'pending'` leads, send the approved WhatsApp template
   via the Cloud API and update `message_status`

## Required Netlify environment variables

Set these in Site settings > Environment variables (never commit them):

- `GOOGLE_PLACES_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEFAULT_COUNTRY` (optional, defaults to `UG`)
- WhatsApp Cloud API credentials, once the send step is built:
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME`
