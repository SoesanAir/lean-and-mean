# ChatGPT Coach — Setup Guide

One-time setup, ~5 minutes. Result: a **private** GPT called "Lean & Mean
Coach" that reads your real training data by itself.

> **PRIVACY WARNING — READ FIRST**
> This GPT is configured with your personal access token. Anyone who can use
> the GPT can query **your** training data through its actions.
> **Do not share, link or publish this GPT while it uses your personal PAT.**
> Keep it "Only me". Revoking the token in Lean & Mean (Progress → Coach API
> access → Revoke) kills the GPT's access immediately.
> The token goes ONLY into the Action's authentication field — never into the
> Instructions text, the schema, or a chat message.

## 1. Get a token

1. Open https://soesanair.github.io/lean-and-mean/ and sign in.
2. **Progress** tab → scroll down → expand **COACH API ACCESS**.
3. Token name: `ChatGPT` → **GENERATE TOKEN**.
4. **Copy** the `lnm_…` token now — it is shown only once.

## 2. Create the GPT (ChatGPT on the web)

1. Go to https://chatgpt.com → your profile → **My GPTs** → **Create a GPT**
   (labels may vary slightly; it's the custom-GPT editor).
2. Switch to the **Configure** tab.
3. **Name:** `Lean & Mean Coach`.
4. **Description:** `Analytical coach for my Lean & Mean training log.`
5. **Instructions:** paste everything between `---INSTRUCTIONS START---` and
   `---INSTRUCTIONS END---` from `docs/chatgpt-coach-instructions.md`.
6. **Conversation starters:** add the 5 from the same file.
7. Recommended: disable capabilities you don't need (web browsing, image
   generation) — the coach only needs its Action.

## 3. Add the Action

1. Still in Configure → **Create new action** (bottom).
2. **Import from URL** and paste:
   `https://soesanair.github.io/lean-and-mean/chatgpt-action-openapi.json`
   (or paste the file's contents into the Schema box — same thing).
3. **Authentication** → **API Key** → Auth Type **Bearer**.
4. Paste your `lnm_…` token into the API key/secret field. Nowhere else.
5. Optional: use the editor's "Test" button on `getToday` — you should see
   your data, not a 401.
6. Privacy policy field (if required for saving): you can use
   `https://soesanair.github.io/lean-and-mean/` (personal single-user app).

## 4. Save privately & test

1. Save/Share setting: **Only me**.
2. Open a fresh chat with the GPT and ask: **How did I do today?**
   → it must call `getToday` and answer from your actual data.
3. Ask: **How is my clean & press progressing?**
   → it should call `findExercises`, then `getExerciseHistory`.
4. Ask: **Anything worrying in my recent notes?**
   → it should call `getRecentNotes`.
5. On your phone: the ChatGPT mobile app → My GPTs → Lean & Mean Coach —
   works with the same configuration, nothing extra to set up.

## Troubleshooting

- **401 in the action test** → token mistyped, or it was revoked; generate a
  new one and update the Action's auth field.
- **GPT "can't find" an exercise** → ask it to search: "find my clean press
  exercise" (it calls `findExercises`); the API matches loose names and
  aliases like C&P.
- **Empty /today** → no session logged today (the coach should say exactly
  that, not invent one).
- Rotating tokens: generate a new token in the app, update the Action auth
  field, then revoke the old one.
