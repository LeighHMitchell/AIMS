-- Create waitlist_signups table
CREATE TABLE IF NOT EXISTS waitlist_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    signed_up_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    source TEXT DEFAULT 'landing_page',
    notes TEXT
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_email ON waitlist_signups(email);

-- Create index on signed_up_at for sorting
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_signed_up_at ON waitlist_signups(signed_up_at DESC);

-- Enable RLS
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public signup)
CREATE POLICY "Anyone can sign up for waitlist" ON waitlist_signups
    FOR INSERT
    WITH CHECK (true);

-- Only authenticated admin users can view waitlist
CREATE POLICY "Only admins can view waitlist" ON waitlist_signups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Only admins can update waitlist entries
CREATE POLICY "Only admins can update waitlist" ON waitlist_signups
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Only admins can delete waitlist entries
CREATE POLICY "Only admins can delete waitlist" ON waitlist_signups
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Add comment to table
COMMENT ON TABLE waitlist_signups IS 'Stores email signups for the product waitlist';
