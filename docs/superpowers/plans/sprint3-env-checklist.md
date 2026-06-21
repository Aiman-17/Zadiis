# Sprint 3 — Vercel Environment Variables Checklist

Run this checklist before deploying Sprint 3 to production.

## Vercel Dashboard → Project → Settings → Environment Variables

- [ ] `NEXT_PUBLIC_APP_URL` = `https://zadiis.com.pk`
- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` = your real WhatsApp number (e.g. `923001234567`)
- [ ] `RESEND_FROM` = `ZADIIS <orders@zadiis.com.pk>`
- [ ] `RESEND_API_KEY` — already set ✓
- [ ] `OWNER_EMAIL` = `zadiisfashion@gmail.com` — already set ✓
- [ ] `SAFEPAY_API_KEY` — already set (sandbox) ✓
- [ ] `SAFEPAY_SECRET_KEY` — already set ✓
- [ ] `NEXT_PUBLIC_SAFEPAY_ENV` = `sandbox` (change to `production` when Safepay merchant account approved)
- [ ] `SUPABASE_URL` — already set ✓
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — already set ✓

## Supabase SQL Editor (run before deploying)

- [ ] Run `store/supabase/sprint3.sql` — adds safepay columns + invoices table

## Safepay Webhook Registration

- [ ] Safepay Sandbox Dashboard → Settings → Webhooks → add URL:
  `https://zadiis.com.pk/api/webhooks/safepay`
- [ ] For local testing: use ngrok (`ngrok http 3000`) and register the ngrok URL temporarily

## Resend Domain Verification

- [ ] resend.com → Domains → Add `zadiis.com.pk`
- [ ] Add SPF, DKIM, DMARC DNS records in Cloudflare
- [ ] Verify green status in Resend dashboard

## Cloudflare Email Routing

- [ ] Enable Email Routing for zadiis.com.pk
- [ ] Add destination: `zadiisfashion@gmail.com` (verify via email)
- [ ] Add routing rule: `info@zadiis.com.pk` → `zadiisfashion@gmail.com`
- [ ] Add routing rule: `support@zadiis.com.pk` → `zadiisfashion@gmail.com`
- [ ] Do NOT enable catch-all

## After Deploy

- [ ] Trigger redeploy in Vercel after setting env vars
- [ ] Test Safepay sandbox payment end-to-end
- [ ] Verify webhook fires and order marks paid
- [ ] Verify customer and owner emails arrive
