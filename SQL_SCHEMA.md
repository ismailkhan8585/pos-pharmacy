# Supabase Setup Guide for AN MedCare POS

**Owner**: Adil Nawaz  
**Pharmacy**: AN MedCare, Swabi, KPK, Pakistan  
**Database**: Supabase Free Tier (PostgreSQL)  

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and log in (or sign up for free).
2. Click **New project**.
3. Name your project: `anmedcare-pos`.
4. Set a strong database password (store it safely).
5. Choose the closest region (e.g. `Singapore` or `Mumbai` for lowest latency to Pakistan).
6. Click **Create new project**.

---

## 2. Run Database Migration

1. In your Supabase project dashboard, open the **SQL Editor** from the left menu.
2. Click **New query**.
3. Copy the entire contents of [`SQL_SCHEMA.sql`](./SQL_SCHEMA.sql) and paste it into the editor.
4. Click **Run** (or press `Ctrl + Enter`).
5. Confirm that all tables, stored procedures, RLS policies, and seed products (Panadol, Augmentin, Risek, Arinac, Disprin, etc.) are created successfully.

---

## 3. Configure `.env.local`

1. In Supabase, navigate to **Project Settings** (gear icon) > **API**.
2. Copy the **Project URL** and the **`anon` `public` Key**.
3. Open `d:\officeWebsite\POS\anmedcare-pos\.env.local` and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

---

## 4. Default Credentials & Quick Access

- **Default PIN**: `1234`
- **Owner**: Adil Nawaz
- **Role**: Administrator / Owner
- **Currency**: Pakistani Rupee (`Rs.`)
- **Thermal Printer**: Standard 80mm ESC/POS compatible

---

## 5. Offline Capabilities

The system uses a hybrid architecture:
- When internet is available, transactions instantly sync to Supabase.
- When offline at the counter, catalog data is stored locally in the browser.
