# Pepper House / Breona Business Solutions - Adatbázis séma

## 1. Alap táblák

### UNITS (Egységek)
```sql
units (
  id UUID PRIMARY KEY,
  name TEXT,
  type TEXT,              -- 'restaurant', 'events'
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### USER_PROFILES (Felhasználók)
```sql
user_profiles (
  id UUID PRIMARY KEY,    -- auth.users-hez kapcsolódik
  full_name TEXT,
  role TEXT,              -- 'admin', 'unit', 'events', 'accountant'
  unit_id UUID REFERENCES units(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 2. Pénzügyi táblák

### DAILY_REVENUE (Napi forgalom)
```sql
daily_revenue (
  id UUID PRIMARY KEY,
  unit_id UUID REFERENCES units(id),
  date DATE,
  total_revenue NUMERIC,
  customer_count INTEGER,
  vat_0_percent NUMERIC,
  vat_5_percent NUMERIC,
  vat_18_percent NUMERIC,
  vat_27_percent NUMERIC,
  tips NUMERIC,
  discrepancy_amount NUMERIC,
  discrepancy_currency TEXT,
  discrepancy_note TEXT,
  cash_payment NUMERIC,
  card_payment NUMERIC,
  szep_card_payment NUMERIC,
  terminal_card NUMERIC,
  terminal_szep NUMERIC,
  terminal_discrepancy_note TEXT,
  mark_color TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### CASH_REGISTERS (Pénztárgépek)
```sql
cash_registers (
  id UUID PRIMARY KEY,
  unit_id UUID REFERENCES units(id),
  ap_number VARCHAR,
  terminal_number VARCHAR,
  name VARCHAR,
  status VARCHAR,
  notes TEXT,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### CASH_REGISTER_REVENUE (Pénztárgép forgalom)
```sql
cash_register_revenue (
  id UUID PRIMARY KEY,
  daily_revenue_id UUID REFERENCES daily_revenue(id),
  cash_register_id UUID REFERENCES cash_registers(id),
  vat_0_percent NUMERIC,
  vat_5_percent NUMERIC,
  vat_18_percent NUMERIC,
  vat_27_percent NUMERIC,
  tips NUMERIC,
  discrepancy_amount NUMERIC,
  discrepancy_currency VARCHAR,
  discrepancy_note TEXT,
  cash_payment NUMERIC,
  card_payment NUMERIC,
  szep_card_payment NUMERIC,
  terminal_card NUMERIC,
  terminal_szep NUMERIC,
  terminal_discrepancy_note TEXT,
  discrepancies JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### HOUSE_CASH (Házipénztár)
```sql
house_cash (
  id UUID PRIMARY KEY,
  unit_id UUID REFERENCES units(id),
  date DATE,
  change_amount NUMERIC,
  official_daily_cash NUMERIC,
  official_other_income NUMERIC,
  official_cash_expenses NUMERIC,
  official_employment_expenses NUMERIC,
  official_total NUMERIC,
  other_difference NUMERIC,
  other_extra_income NUMERIC,
  other_expenses NUMERIC,
  other_total NUMERIC,
  mark_color TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### EXPENSES (Kiadások)
```sql
expenses (
  id UUID PRIMARY KEY,
  unit_id UUID REFERENCES units(id),
  supplier_name TEXT,
  invoice_number TEXT,
  amount NUMERIC,
  currency TEXT,
  item_description TEXT,
  payment_method TEXT,
  invoice_date DATE,
  payment_deadline DATE,
  fulfillment_date DATE,
  is_official BOOLEAN,
  notes TEXT,
  mark_color TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### MONTHLY_FINANCIAL_DATA (Havi pénzügyi adatok)
```sql
monthly_financial_data (
  id UUID PRIMARY KEY,
  year_month TEXT,        -- '2026-01'
  unit_id UUID REFERENCES units(id),
  category TEXT,
  paid_wages NUMERIC,
  wage_contributions NUMERIC,
  raw_material_distribution NUMERIC,
  wage_distribution NUMERIC,
  subvention NUMERIC,
  k0_revenue NUMERIC,
  bank_costs_amount NUMERIC,
  transfer_expenses NUMERIC,
  equipment_expenses NUMERIC,
  rent_utilities NUMERIC,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### BUDGET_TARGETS (Költségvetési célok)
```sql
budget_targets (
  id UUID PRIMARY KEY,
  year_month TEXT,
  period_type TEXT,       -- 'monthly', 'yearly'
  unit_id UUID REFERENCES units(id),
  category TEXT,
  planned_revenue NUMERIC,
  planned_cost NUMERIC,
  planned_margin NUMERIC,
  planned_wage_cost NUMERIC,
  planned_material_cost NUMERIC,
  planned_overhead NUMERIC,
  planned_other_cost NUMERIC,
  status TEXT,
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 3. Rendezvények

### EVENTS (Rendezvények)
```sql
events (
  id UUID PRIMARY KEY,
  unit_id UUID REFERENCES units(id),
  name TEXT,
  event_type TEXT,
  event_date DATE,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### EVENT_REVENUES (Rendezvény bevételek)
```sql
event_revenues (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  unit_id UUID REFERENCES units(id),
  partner_name TEXT,
  amount NUMERIC,
  net_amount NUMERIC,
  vat_rate INTEGER,
  currency TEXT,
  payment_method TEXT,
  invoice_date DATE,
  payment_deadline DATE,
  fulfillment_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### EVENT_EXPENSES (Rendezvény kiadások)
```sql
event_expenses (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  unit_id UUID REFERENCES units(id),
  supplier_name TEXT,
  invoice_number TEXT,
  amount NUMERIC,
  net_amount NUMERIC,
  vat_rate INTEGER,
  currency TEXT,
  item_description TEXT,
  payment_method TEXT,
  invoice_date DATE,
  payment_deadline DATE,
  fulfillment_date DATE,
  is_official BOOLEAN,
  is_efo BOOLEAN,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 4. CRM / Sales

### COMPANIES (Cégek)
```sql
companies (
  id UUID PRIMARY KEY,
  name TEXT,
  type TEXT,              -- 'customer', 'supplier', 'partner'
  supplier_category TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_number TEXT,
  our_contact_id UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### COMPANY_CONTACTS (Kapcsolattartók)
```sql
company_contacts (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT,
  title TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### DEALS (Ajánlatok)
```sql
deals (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT,
  description TEXT,
  expected_value NUMERIC,
  currency TEXT,
  status TEXT,            -- 'open', 'won', 'lost'
  probability INTEGER,
  expected_close_date DATE,
  actual_close_date DATE,
  our_contact_id UUID,
  company_contact_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### SALES_EVENTS (Értékesítési események)
```sql
sales_events (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  deal_id UUID REFERENCES deals(id),
  event_type TEXT,
  event_date DATE,
  our_contact_id UUID,
  priority TEXT,
  amount NUMERIC,
  currency TEXT,
  probability INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### CAMPAIGNS (Kampányok)
```sql
campaigns (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  campaign_type campaign_type,  -- ENUM
  status campaign_status,       -- ENUM
  start_date DATE,
  end_date DATE,
  target_audience TEXT,
  budget NUMERIC,
  actual_cost NUMERIC,
  expected_revenue NUMERIC,
  actual_revenue NUMERIC,
  unit_ids UUID[],
  discount_percentage NUMERIC,
  discount_amount NUMERIC,
  promo_code TEXT,
  terms_conditions TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### DISCOUNTS (Kedvezmények)
```sql
discounts (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  discount_type discount_type,  -- ENUM
  value NUMERIC,
  min_purchase_amount NUMERIC,
  max_discount_amount NUMERIC,
  promo_code TEXT,
  is_active BOOLEAN,
  start_date DATE,
  end_date DATE,
  unit_ids UUID[],
  usage_limit INTEGER,
  usage_count INTEGER,
  applicable_categories TEXT[],
  applicable_products TEXT[],
  terms_conditions TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### COMPLAINTS (Reklamációk)
```sql
complaints (
  id UUID PRIMARY KEY,
  complaint_number TEXT UNIQUE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  unit_id UUID REFERENCES units(id),
  complaint_date DATE,
  category TEXT,
  description TEXT,
  status complaint_status,      -- ENUM
  priority ticket_priority,     -- ENUM
  assigned_to UUID REFERENCES user_profiles(id),
  resolution TEXT,
  compensation_type TEXT,
  compensation_value NUMERIC,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 5. Dokumentumok

### DOCUMENT_TOPICS (Témakörök)
```sql
document_topics (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  sort_order INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### DOCUMENTS (Dokumentumok)
```sql
documents (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  sharepoint_item_id TEXT,
  sharepoint_drive_id TEXT,
  sharepoint_path TEXT,
  sharepoint_web_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  document_date DATE,
  topic_id UUID REFERENCES document_topics(id),
  unit_id UUID REFERENCES units(id),
  tags TEXT[],
  year INTEGER,
  access_level TEXT,
  sync_status TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### MICROSOFT_TOKENS (MS Graph tokenek)
```sql
microsoft_tokens (
  id UUID PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  drive_id TEXT,
  is_storage_account BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## 6. Support & Audit

### SUPPORT_TICKETS (Támogatási jegyek)
```sql
support_tickets (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  status ticket_status,         -- ENUM
  priority ticket_priority,     -- ENUM
  category TEXT,
  reported_by UUID REFERENCES user_profiles(id),
  assigned_to UUID REFERENCES user_profiles(id),
  unit_id UUID REFERENCES units(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### AUDIT_LOG (Audit napló)
```sql
audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  user_email TEXT,
  action TEXT,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ
)
```

---

## 7. Webshop

### WEBSHOP_DAILY_REVENUE (Webshop napi forgalom)
```sql
webshop_daily_revenue (
  id UUID PRIMARY KEY,
  unit_id UUID REFERENCES units(id),
  date DATE,
  order_count INTEGER,
  gross_revenue NUMERIC,
  net_revenue NUMERIC,
  vat_amount NUMERIC,
  discount_amount NUMERIC,
  shipping_revenue NUMERIC,
  refund_amount NUMERIC,
  payment_method_breakdown JSONB,
  product_category_breakdown JSONB,
  notes TEXT,
  imported_at TIMESTAMPTZ,
  imported_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(unit_id, date)
)
```

---

## 8. Munkatér (Workspace)

### WORKSPACE_CHANNELS (Csatornák)
```sql
workspace_channels (
  id UUID PRIMARY KEY,
  name TEXT,
  slug TEXT UNIQUE,
  description TEXT,
  channel_type TEXT,      -- 'common', 'unit', 'events', 'leadership'
  unit_id UUID REFERENCES units(id),
  is_active BOOLEAN,
  created_by UUID,
  created_at TIMESTAMPTZ
)
```

### WORKSPACE_MESSAGES (Üzenetek)
```sql
workspace_messages (
  id UUID PRIMARY KEY,
  channel_id UUID REFERENCES workspace_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT,
  message_type TEXT,      -- 'text', 'link', 'task'
  link_url TEXT,
  link_title TEXT,
  task_assignee_id UUID,
  task_due_date DATE,
  task_completed BOOLEAN,
  task_completed_at TIMESTAMPTZ,
  task_completed_by UUID,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### WORKSPACE_SUBSCRIPTIONS (Feliratkozások)
```sql
workspace_subscriptions (
  id UUID PRIMARY KEY,
  channel_id UUID REFERENCES workspace_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  notify_email BOOLEAN,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  UNIQUE(channel_id, user_id)
)
```

---

## 9. Konfiguráció

### EXCEL_IMPORT_CONFIG (Excel import beállítások)
```sql
excel_import_config (
  id UUID PRIMARY KEY,
  file_path TEXT,
  sheet_name TEXT,
  data_type TEXT,
  mapping_config JSONB,
  is_active BOOLEAN,
  last_import_at TIMESTAMPTZ,
  last_import_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

---

## ENUM típusok

```sql
-- Jegy státusz
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Jegy prioritás
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Kampány státusz
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');

-- Kampány típus
CREATE TYPE campaign_type AS ENUM ('discount', 'promotion', 'event', 'seasonal', 'loyalty', 'other');

-- Reklamáció státusz
CREATE TYPE complaint_status AS ENUM ('new', 'investigating', 'resolved', 'rejected', 'closed');

-- Kedvezmény típus
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'buy_x_get_y', 'bundle', 'loyalty', 'employee', 'other');
```

---

## Fontos RLS függvények

```sql
-- Felhasználó szerepkörének lekérdezése (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;

-- Felhasználó egységének lekérdezése (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_my_unit_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT unit_id FROM user_profiles WHERE id = auth.uid();
$$;
```

---

## Kapcsolatok áttekintése

```
units ─────────────────────────────────────────────────────────────┐
  │                                                                 │
  ├── user_profiles (unit_id)                                       │
  ├── daily_revenue (unit_id)                                       │
  │     └── cash_register_revenue (daily_revenue_id)                │
  ├── cash_registers (unit_id)                                      │
  ├── house_cash (unit_id)                                          │
  ├── expenses (unit_id)                                            │
  ├── events (unit_id)                                              │
  │     ├── event_revenues (event_id)                               │
  │     └── event_expenses (event_id)                               │
  ├── monthly_financial_data (unit_id)                              │
  ├── budget_targets (unit_id)                                      │
  ├── complaints (unit_id)                                          │
  ├── support_tickets (unit_id)                                     │
  ├── documents (unit_id)                                           │
  ├── webshop_daily_revenue (unit_id)                               │
  └── workspace_channels (unit_id)                                  │
        ├── workspace_messages (channel_id)                         │
        └── workspace_subscriptions (channel_id)                    │

companies ──────────────────────────────────────────────────────────┐
  ├── company_contacts (company_id)                                 │
  ├── deals (company_id)                                            │
  └── sales_events (company_id, deal_id)                            │
```

---

*Generálva: 2026-04-06*
*Verzió: 1.0*
