# Supabase setup — El Afak platform

This repository's public page remains a static site until Supabase is configured. The SQL migration creates the first secure intake table; it does not yet connect the form or provide a staff dashboard.

## 1. Create the Supabase project
1. Open the official Supabase website and create a project for the association.
2. Choose a strong database password and keep it somewhere private.
3. Wait until the database has finished provisioning.

## 2. Apply the database migration
1. In the Supabase dashboard, open **SQL Editor**.
2. Open `supabase/migrations/202610150001_initial_join_requests.sql` in this repository.
3. Copy the entire SQL file into a new SQL Editor query and run it.
4. Confirm that the `public.join_requests` table exists.

The policy intentionally allows public visitors to submit a pending request only. Public visitors cannot read, edit, or delete submissions. Do not loosen those permissions to make the form work.

## 3. Keep credentials safe
- The browser may use only the project's **Project URL** and **publishable/anon key**, and only after the table policies have been checked.
- Never put a **service_role/secret key**, database password, or other privileged secret in HTML, JavaScript, GitHub, or a message.
- For Vercel configuration, use Project Settings → Environment Variables. Do not commit a `.env` file.

## 4. Before making the form live
The website form must be connected and tested against this schema, then spam protection/rate limiting and a secure staff-review mechanism must be added. A president-only review dashboard should use authenticated staff roles; never expose the service-role key to the browser.

Until those steps are complete, the public site must continue to say that online joining is being prepared and must not claim that a request has been recorded.
