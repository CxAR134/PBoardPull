# Board Pack

Pick a Pinterest board, get one PDF an LLM can read: numbered contact sheets of every pin, plus a text manifest (title, description, source link) keyed to the same numbers. Share it straight from your phone.

Works on your own boards only. Pinterest's API does not expose other people's boards.

## Setup (once)

1. **Pinterest token.** developers.pinterest.com -> My apps -> create an app -> Generate access token. Scopes: `boards:read`, `pins:read`. Add `boards:read_secret` and `pins:read_secret` if you want secret boards. Tokens expire; when the app says Pinterest rejected the token, generate a new one and update it in Vercel.
2. **Deploy.** Put this folder in a GitHub repo, then vercel.com -> Add New Project -> import the repo -> Deploy. (Or run `npx vercel` in this folder.)
3. **Environment variables** (Vercel -> Settings -> Environment Variables), then redeploy:
   - `PINTEREST_TOKEN`: the token from step 1
   - `APP_KEY`: any long random string. It stops strangers from using your token.
4. **iPhone.** Open your Vercel URL in Safari -> Share -> Add to Home Screen. Open the app and enter `APP_KEY` once.

## Use

Open the app -> tap a board -> wait for the build -> tap **Share PDF** -> send it to Claude, ChatGPT, or Files.

## Notes

- Sheets use Pinterest's ~600px images. Enough to see each pin, not fine detail.
- Pins per sheet: 6 (most detail), 12 (default), 20 (fewest pages).
- Keep the screen on while it builds. The app asks iOS not to sleep, but a locked phone can pause it.
- The build happens on your phone. Very large boards (hundreds of pins) take a minute or two.
