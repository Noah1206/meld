-- Polar 결제 연동: plan 체크 제약 업데이트 + 구독 컬럼 추가
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_plan_check,
  ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'pro', 'unlimited'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS polar_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;
