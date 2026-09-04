# AN MedCare — Standalone Hybrid POS System

> **Owner & Pharmacist**: Adil Nawaz  
> **Location**: Swabi, KPK, Pakistan  
> **Architecture**: Standalone Hybrid PWA (Counter POS + Mobile Admin)  
> **Database**: Supabase (Free PostgreSQL) + Local IndexedDB Browser Storage  
> **Currency**: Pakistani Rupee (`Rs.`)  

---

## Quick Start & Counter Run

```bash
# 1. Navigate to the project directory
cd d:\officeWebsite\POS\anmedcare-pos

# 2. Run the development server
npm run dev

# 3. Open in Chrome / Edge (Tablet or Laptop)
http://localhost:3000
```

- **Default PIN**: `1234`
- **Counter POS**: `http://localhost:3000/pos`
- **Mobile Admin Dashboard**: `http://localhost:3000/admin`

---

## 1. Supabase Cloud Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in your Supabase dashboard and run the entire [`SQL_SCHEMA.sql`](./SQL_SCHEMA.sql) script.
3. Obtain your **Project URL** and **`anon` `public` Key** from **Project Settings > API**.
4. Configure your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 2. Offline Mode & Hybrid Sync Architecture

AN MedCare POS operates seamlessly even if internet connectivity drops completely:

1. **Instant First-Launch Cache**: On first load with internet, the product catalog is downloaded and stored in browser **IndexedDB** (`anmedcare-pos`).
2. **Offline Sales**: When offline, sales are processed immediately using `RCP-OFF-YYYYMMDD-XXXX` receipt numbers, stock is deducted locally in IndexedDB, and the sale is saved to `pendingSales`.
3. **80mm Thermal Printing**: Thermal receipts print normally with an `** OFFLINE SALE **` indicator.
4. **Background Auto-Sync**: The moment internet reconnects, the background sync engine uploads all pending sales, creates line items, calls the Supabase `deduct_stock` stored procedure, and updates local sale status to `SYNCED`.
5. **Manual Sync**: A one-click `🔄 X offline` button is available in the counter header and in Settings.
6. **Offline Returns**: Returns for offline sales can be processed offline directly against local IndexedDB records.

---

## 3. Hardware Setup Guide

| Hardware | Recommended Specs | Setup Instructions |
|---|---|---|
| **Counter Device** | Android tablet (10"+) or Windows Laptop | Use Google Chrome or Microsoft Edge |
| **80mm Thermal Printer** | USB, Bluetooth, or Network ESC/POS | Set paper width to 80mm in printer driver |
| **Barcode Scanner** | USB or Wireless 1D/2D Barcode Reader | Plug-and-play keyboard wedge mode (Enter suffix) |
| **Backup Internet** | 4G/5G Mobile Hotspot (Rs.500/month) | Keeps cloud sync active during landline outages |

---

## 4. 12-Scenario Testing Guide

| # | Test Scenario | Steps | Expected Result |
|---|---|---|---|
| **1** | **First Launch Online** | Open POS on fresh browser | Shows loading screen, products download into IndexedDB |
| **2** | **Basic Online Sale** | Sell 2 Panadol → Checkout → Print | Sale appears in Supabase `sales` table; stock reduced by 2 |
| **3** | **Go Offline Simulation** | DevTools > Network > select "Offline" | Header shows `🟡 Offline` pill; amber banner appears |
| **4** | **Offline Sale** | Sell 1 Brufen while offline | Receipt displays `RCP-OFF-...`; stored in `pendingSales` |
| **5** | **Multiple Offline Sales** | Make 3 more offline sales | Header updates to `🔄 4 offline`; local stock decreases |
| **6** | **Auto-Sync on Reconnect** | Turn Network back to "Online" | Top progress bar animates; toast confirms `✅ 4 sales synced` |
| **7** | **Manual Sync Button** | Go offline, make 1 sale, go online, click `🔄 1 offline` | Triggers manual sync and updates pending count to 0 |
| **8** | **Hold Bill Offline** | Add items → click Hold → Name "Customer A" | Saved to IndexedDB; resume restores all items |
| **9** | **Offline Return** | Click Return → search `RCP-OFF-...` | Found in IndexedDB; stock restored locally |
| **10** | **PWA Installation** | Click "Install" banner at bottom | Installs as standalone app without browser address bar |
| **11** | **Cold Boot Offline** | Open installed PWA with WiFi OFF | App opens instantly via Service Worker cache |
| **12** | **Settings Persistence** | Update receipt footer in Settings while offline | Persists in browser and prints on new receipts |

---

## 5. Data Recovery & Troubleshooting Guide

### Scenario 1: Tablet Crashes Mid-Sale
- **Recovery**: Reopen POS. Check `pendingSales` or active bill. If completed, it will sync automatically when online.
- **Protection**: POS saves to IndexedDB before triggering print.

### Scenario 2: Browser Storage Cleared Accidentally
- **Recovery**: Connect to internet; POS automatically reloads all catalog data and categories from Supabase.
- **Caution**: **DO NOT CLEAR BROWSER SITE DATA** on the counter tablet to preserve unsynced receipts.

### Scenario 3: Supabase Free Tier Usage
- Supabase Free Tier gives **500MB database storage** (equivalent to ~500,000 pharmacy transactions).
- Backup & export sales annually via Supabase dashboard or CSV export.

### Scenario 4: Forgot PIN
- Default master PIN is `1234`.
- Reset via `public.settings` table in Supabase dashboard under `pin_hash`.

### Scenario 5: Counter POS Won't Load
1. Hard refresh with `Ctrl + Shift + R` (or clear browser cache, keeping cookies).
2. Verify WiFi connection.
3. Check `http://localhost:3000/api/health`.

---

## 6. Project File Structure

```
anmedcare-pos/
├── app/
│   ├── admin/             # Mobile owner dashboard & reports
│   ├── inventory/         # Products, receive, count, expiry, adjust
│   ├── login/             # 4-digit PIN authentication
│   ├── pos/               # Two-panel counter point-of-sale
│   ├── purchases/         # Purchase order tracking
│   ├── reports/           # Business analytics & charts
│   ├── settings/          # 6 configuration tabs
│   ├── shifts/            # Cash drawer & shift logs
│   └── suppliers/         # Vendor directory
├── components/pos/        # POS UI, modals, scanner, banners
├── lib/
│   ├── auth.ts            # PIN auth, SHA-256, session lockout
│   ├── pos-db-local.ts    # IndexedDB database wrapper
│   ├── pos-helpers.ts     # Formatting, receipt numbering
│   ├── pos-receipt.ts     # 80mm ESC/POS thermal receipt engine
│   ├── pos-sync.ts        # Background sync engine
│   └── supabase.ts        # Supabase client & RPC procedures
├── public/
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker offline caching
│   ├── icon-192.png       # App icon (192x192)
│   └── icon-512.png       # App icon (512x512)
├── stores/                # Zustand state stores (cart, products, shift, etc.)
└── SQL_SCHEMA.sql         # Supabase PostgreSQL schema & seed catalog
```
