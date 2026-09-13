# lead-gen-agent

Finds business leads (name, address, phone, website, rating) using the
Google Places API (New), and saves them to a CSV file.

## Setup

1. Install [Node.js](https://nodejs.org/) (v18+ recommended — it needs
   built-in `fetch`).
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and paste in your Google Places API key:

   ```bash
   cp .env.example .env
   ```

   Get a key from Google Cloud Console:
   - Create/select a project
   - Enable "Places API (New)" under APIs & Services > Library
   - Attach a billing account (required, but a free monthly credit covers
     light testing)
   - Create an API key under APIs & Services > Credentials
   - Restrict the key to "Places API (New)"

## Usage

```bash
node find-leads.js "hardware shops in Mbarara"
```

This prints the results to the terminal and saves them as a CSV in the
`output/` folder (created automatically), named after your search query.

## Next steps

- WhatsApp outreach (checking numbers / sending messages) — to be added
  once the Meta Business Manager / WhatsApp API decision is made.
- Optional: AI-personalized messages via a separate Anthropic API key.
