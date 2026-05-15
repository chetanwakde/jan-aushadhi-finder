-- Jan Aushadhi Finder — Supabase/PostgreSQL Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL, -- Storing as text to support flexible IDs
    medicine_name TEXT NOT NULL,
    generic_name TEXT DEFAULT '',
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    next_refill_date DATE NOT NULL,
    notes TEXT DEFAULT '',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Analytics Table
CREATE TABLE IF NOT EXISTS analytics (
    key TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0
);

-- 4. Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    medicine_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, medicine_id)
);

-- 5. Search History Table
CREATE TABLE IF NOT EXISTS search_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT,
    query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    phone TEXT,
    timings TEXT,
    rating DOUBLE PRECISION DEFAULT 4.5,
    total_medicines INTEGER DEFAULT 1200
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);

-- ─── INITIAL ANALYTICS SEED ───────────────────────────────────────────────────
INSERT INTO analytics (key, value) VALUES 
('searches', 0),
('savingsCalculated', 0),
('stockRequests', 0),
('remindersCreated', 0),
('registrations', 0)
ON CONFLICT (key) DO NOTHING;
