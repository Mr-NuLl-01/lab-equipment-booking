# Security Policy

This repository is intended to be a reusable public template for a lab
equipment booking system. Do not commit deployment secrets or real private lab
data to this repository.

## Secrets

- Keep real environment variables only in local `.env.local`, production
  platform settings, or a private secret manager.
- Never commit Supabase service role keys.
- Values prefixed with `NEXT_PUBLIC_` are exposed to the browser by Next.js.
  Only put public Supabase project URL and anon key there.
- If a real secret was ever committed, rotate it in Supabase or the deployment
  platform before continuing to use the project.

## Public Data Hygiene

- Replace demo equipment, locations, member names, phone numbers, emails, and
  domain names before publishing a customized fork.
- Keep seed data generic. Real equipment inventory and room numbers should live
  in the private Supabase database, not in public source code.
- Do not commit `.vercel`, `.next`, exported database dumps, screenshots with
  user data, or production logs.

## Recommended Checks Before Publishing

Run these commands before pushing to a public repository:

```bash
npm run lint
npm run build
git diff --check
git grep -n -E "SERVICE_ROLE|SUPABASE_SERVICE|eyJ|supabase\\.co|@|phone|电话|手机号|真实姓名|身份证|lab-equipment\\.asia|vercel\\.app"
git ls-files | grep -E '(^|/)(\\.env|\\.env\\.local|\\.vercel|\\.next|node_modules|.*dump.*|.*backup.*)'
```

The final two commands are review aids. They may include safe examples or
placeholder values; inspect any matches before publishing.
