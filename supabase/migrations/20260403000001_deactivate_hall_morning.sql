-- Fix: hall_morning (ungated pool storylet) competes with and beats
-- the gated morning_after_* variants because it has no requires_choice.
-- Deactivate it so the pool scan only finds the correct gated variant.
-- CONTENT-RULES: hall_morning was a legacy fallback; the three
-- morning_after_* pool storylets are the intended Day 2 morning content.

UPDATE storylets
SET is_active = false
WHERE storylet_key = 'hall_morning';
