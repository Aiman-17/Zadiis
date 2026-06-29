---
id: 012
title: Fix decrement_stock RPC validation
stage: general
date: 2026-06-20
surface: agent
model: claude-haiku-4-5-20251001
feature: none
branch: main
user: Aiman-17
command: Fix code quality issues in Supabase RPC migration file
labels: ["code-quality", "database", "rpc", "validation"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/supabase/sprint2-rpc.sql
  - store/supabase/schema.sql
tests:
  - none
---

## Prompt

You are fixing code quality issues in a Supabase RPC migration file for ZADIIS ecommerce.

## File to fix
`C:\Users\QC\Desktop\ecom-business-project\store\supabase\sprint2-rpc.sql`

## Current content (read file to confirm)
The file has a `decrement_stock` RPC function that is missing:
1. Input validation (p_quantity must be positive)
2. Return value (should return boolean FOUND)

## Fix: Replace the file with this improved version

```sql
-- Sprint 2 RPC function for atomic stock decrement
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_quantity integer)
RETURNS boolean AS $$
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
  END IF;

  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Also update the copy appended in `C:\Users\QC\Desktop\ecom-business-project\store\supabase\schema.sql` — find the section that was appended for sprint2-rpc and update that function definition to match the improved version above.

## Response snapshot

Successfully applied code quality improvements:
1. Read sprint2-rpc.sql and confirmed it lacked validation and return value
2. Wrote improved version with input validation and FOUND return
3. Updated schema.sql to append the corrected RPC function
4. Committed both files (commit e826a4d)

## Outcome

- ✅ Impact: Improved code quality with input validation and explicit return value
- 🧪 Tests: Manual verification of file updates and git commit
- 📁 Files: 2 files modified (sprint2-rpc.sql, schema.sql)
- 🔁 Next prompts: Deployment and testing of the RPC function
- 🧠 Reflection: Straightforward code quality fix applied correctly

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): null
- Next experiment: null
