# LocalLens notes

## How to run

1. Put the OpenAI key in a local `.env` file as `OPENAI_API_KEY=...`.
2. Optionally set `OPENAI_MODEL=...`; the default is `gpt-6-luna` because no model was previously recorded.
3. Run `node server.js`.
4. Open `http://localhost:3000` in a browser.

## What’s done

- Saved the project brief in `BRIEF.md`.
- Built Version 1 around the four MVP features: vibe/crowd summary, labeled review clues, side-by-side comparison, and safe AI answers.
- Added localStorage demo data with clearly labeled made-up sample restaurants.
- Added a small server proxy so the OpenAI key stays in `.env` and never reaches the page.
- Added a friendly error when the key is missing, expired, or the network is unavailable.
- Model: `gpt-6-luna` by default; set `OPENAI_MODEL` in `.env` to override it.
- The preview and localStorage save flow work. The real AI call is ready but needs a local `.env` key in this workspace before it can be tested.

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
