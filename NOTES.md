# LocalLens notes

## How to run

1. Put `KEYGEN_URL=...` and `KEYGEN_TOKEN=...` in the local `.env` file for the AI key service. The server gets the short-lived AI key through `getKey()`; the browser never sees the key or token.
2. OpenStreetMap live place search is the default and does not need a billing key.
3. Optionally set `PLACES_PROVIDER=google` with `GOOGLE_PLACES_API_KEY=...` if a billing-enabled Google project is available.
4. The requested model is `gpt-6-luna`; set `OPENAI_MODEL=gpt-6-luna` locally or in Vercel when using that model.
5. MindDo key access currently includes `gpt-5.6-luna` (found through `getKey()` and the OpenAI models list).
6. Run `node server.js`.
7. Open `http://localhost:3000` in a browser.

## How to put it online with Vercel

- Import the GitHub repository `nospandish/LocalLens` into Vercel.
- Keep the project root as the repository root. No build command is needed.
- Vercel serves the page from `public/` using `vercel.json` and runs `api/recommendations.js` as the small Node.js server function.
- In Vercel Project Settings → Environment Variables, add `KEYGEN_URL` and `KEYGEN_TOKEN` for Preview and Production. The server gets the AI key through `getKey()`; do not add an OpenAI key to the code or page. No place-data key is needed for the default OpenStreetMap search.
- `OPENAI_MODEL` is optional; if it is not set, LocalLens uses `gpt-6-luna`.
- If `PLACES_PROVIDER=google` is chosen, add `GOOGLE_PLACES_API_KEY`, enable Places API (New), and enable billing in Google Cloud. Otherwise no other Vercel setting is required for place search.
- For local work, keep using `node server.js` and a local `.env`. `.env*` stays ignored by Git.

## What’s done

- Saved the project brief in `BRIEF.md`.
- Built Version 1 around the four MVP features: vibe/crowd summary, labeled review clues, side-by-side comparison, and safe AI answers.
- Added localStorage demo data with clearly labeled made-up sample restaurants as a fallback.
- Added a server-side OpenStreetMap search for real restaurant/place names and addresses without billing. Reviews, hours, and crowd levels stay clearly labeled as unavailable.
- Kept Google Places as an optional provider, not the default.
- OpenStreetMap requests happen only after a user submits the form; keep use moderate and do not add autocomplete or background polling. Attribution is shown in the footer.
- Added a small server proxy so the OpenAI key stays in `.env` and never reaches the page.
- Added a friendly error when the key is missing, expired, or the network is unavailable.
- Model: `gpt-6-luna` by default; set `OPENAI_MODEL` in `.env` to override it.
- The preview and localStorage save flow work. The real AI call is ready but needs a local `.env` key in this workspace before it can be tested.
- Added Vercel-ready routing and a shared AI helper for the local server and `api/recommendations.js`.
- The restaurant name is optional: users can ask for good options first, then choose a place or compare two demo options. A named demo restaurant still gets a safe local crowd/vibe summary when the AI key is unavailable.
- Review clues are now grouped under visible labels such as `quiet`, `good for groups`, and `usually crowded`.
- Verified the side-by-side comparison flow: two selected cards render together with their own vibe, crowd clue, labels, and data status; a third selection is blocked.
- Added AI input-handling rules for missing details, vague or unclear restaurant requests, off-topic questions, and unsafe requests.
- Demo restaurant cards now reorder based on the neighborhood, food, budget, group size, and optional restaurant name entered in the form.
- If the local AI message appears, fill in `KEYGEN_URL` and `KEYGEN_TOKEN` in `.env` and restart `node server.js`; on Vercel, add those two variables in Project Settings and redeploy. Request failures include a safe user message and a separate fix that is logged by the server.

Saves on this computer only for now.

## Maybe Later

- The user can see when each piece of restaurant info was collected.
- The user can see what evidence the AI used for each label.
- The user can filter places by what they want, like quiet or fast.
- The user can ask which time of day is usually least crowded.
- The user can see the menu highlights in one short list.
- The user can search by neighborhood name instead of sharing exact location.
- The user can see a reminder to check plans with a trusted adult.
- The user can save favorite places on their phone.

After each save point, push it to GitHub.
