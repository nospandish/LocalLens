# LocalLens notes

## How to run

1. Put the OpenAI key in a local `.env` file as `OPENAI_API_KEY=...`.
2. Optionally set `OPENAI_MODEL=...`; the default is `gpt-6-luna` because no model was previously recorded.
3. Run `node server.js`.
4. Open `http://localhost:3000` in a browser.

## How to put it online with Vercel

- Import the GitHub repository `nospandish/LocalLens` into Vercel.
- Keep the project root as the repository root. No build command is needed.
- Vercel serves the page from `public/` using `vercel.json` and runs `api/recommendations.js` as the small Node.js server function.
- In Vercel Project Settings → Environment Variables, add `OPENAI_API_KEY` for Preview and Production. Keep the key out of the repository.
- `OPENAI_MODEL` is optional; if it is not set, LocalLens uses `gpt-6-luna`.
- No other Vercel setting is required for this project.
- For local work, keep using `node server.js` and a local `.env`. `.env*` stays ignored by Git.

## What’s done

- Saved the project brief in `BRIEF.md`.
- Built Version 1 around the four MVP features: vibe/crowd summary, labeled review clues, side-by-side comparison, and safe AI answers.
- Added localStorage demo data with clearly labeled made-up sample restaurants.
- Added a small server proxy so the OpenAI key stays in `.env` and never reaches the page.
- Added a friendly error when the key is missing, expired, or the network is unavailable.
- Model: `gpt-6-luna` by default; set `OPENAI_MODEL` in `.env` to override it.
- The preview and localStorage save flow work. The real AI call is ready but needs a local `.env` key in this workspace before it can be tested.
- Added Vercel-ready routing and a shared AI helper for the local server and `api/recommendations.js`.
- The named-restaurant MVP flow now requires a restaurant name and can show a safe local demo crowd/vibe summary even when the AI key is unavailable.
- If the local AI message appears, create `.env` with `OPENAI_API_KEY=...` and restart `node server.js`; on Vercel, add the same variable in Project Settings and redeploy.

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
