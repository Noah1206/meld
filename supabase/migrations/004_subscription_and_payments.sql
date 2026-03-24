-- users 테이블: subscription_status, credits 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'inactive')),
  ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

-- payments 테이블 생성
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,            -- 원 단위 (센트 단위 등)
  currency TEXT NOT NULL DEFAULT 'KRW',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  provider TEXT NOT NULL,             -- 'polar', 'stripe' 등
  provider_payment_id TEXT,           -- 외부 결제 ID
  plan TEXT,                          -- 결제 시점의 플랜
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
