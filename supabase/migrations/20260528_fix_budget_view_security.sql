-- Fix budget_vs_actual view security
-- Change from SECURITY DEFINER to SECURITY INVOKER
-- This ensures RLS policies are enforced for the querying user

CREATE OR REPLACE VIEW budget_vs_actual
WITH (security_invoker = true)
AS
SELECT
  bt.id as budget_id,
  bt.year_month,
  bt.unit_id,
  bt.category,
  u.name as unit_name,
  bt.planned_revenue,
  bt.planned_cost,
  bt.planned_margin,
  bt.status,
  bt.created_at,
  bt.updated_at
FROM budget_targets bt
LEFT JOIN units u ON bt.unit_id = u.id
ORDER BY bt.year_month DESC, u.name;

COMMENT ON VIEW budget_vs_actual IS 'Budget vs actual comparison view with SECURITY INVOKER for proper RLS enforcement';
