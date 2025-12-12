This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Waitlist (Google Sheet)

The page posts waitlist emails to `POST /api/waitlist`, which forwards to an Apps Script Web App.

Note: your Google Sheet sharing URL (like `https://docs.google.com/spreadsheets/d/.../edit`) is not the webhook endpoint. You must deploy an **Apps Script Web App** and use its deployment URL.

- Create a Google Sheet
- Open **Extensions → Apps Script** and paste:

```js
function doPost(e) {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const sheet = ss.getSheets()[0];
	const data = JSON.parse(e.postData.contents);
	sheet.appendRow([new Date(), data.email]);
	return ContentService.createTextOutput('ok');
}
```

- Deploy **Deploy → New deployment → Web app**
	- Execute as: **Me**
	- Who has access: **Anyone**
- After deploying, copy the **Web app URL** (it looks like `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`).
- Set `WAITLIST_WEBHOOK_URL` to that URL.

If you change the script code, use **Deploy → Manage deployments** and deploy a **new version**, otherwise the `/exec` URL may still point at the old code.

### Quick webhook test

This should return HTTP 200 and a non-HTML response (for the example script above, it returns `ok`).

```bash
curl -i -X POST \
	-H 'Content-Type: application/json' \
	-d '{"email":"test@example.com"}' \
	'https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec'
```

If you see `405` with `Allow: HEAD, GET`, your deployment likely doesn’t have a `doPost(e)` handler (or you didn’t deploy a new version after adding it).

Local example:

```bash
WAITLIST_WEBHOOK_URL="https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec" npm run dev
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
