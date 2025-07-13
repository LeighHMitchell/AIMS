-- Fix Row Level Security policies for planned_disbursements to allow anonymous access
-- This allows unauthenticated users to create, update, and delete planned disbursements

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view planned disbursements" ON planned_disbursements;
DROP POLICY IF EXISTS "Authenticated users can create planned disbursements" ON planned_disbursements;
DROP POLICY IF EXISTS "Authenticated users can update planned disbursements" ON planned_disbursements;
DROP POLICY IF EXISTS "Authenticated users can delete planned disbursements" ON planned_disbursements;

-- Create new policies that allow anonymous access
-- Allow anyone to view planned disbursements
CREATE POLICY "Anyone can view planned disbursements" ON planned_disbursements
    FOR SELECT
    USING (true);

-- Allow anyone to create planned disbursements
CREATE POLICY "Anyone can create planned disbursements" ON planned_disbursements
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to update planned disbursements
CREATE POLICY "Anyone can update planned disbursements" ON planned_disbursements
    FOR UPDATE
    USING (true);

-- Allow anyone to delete planned disbursements
CREATE POLICY "Anyone can delete planned disbursements" ON planned_disbursements
    FOR DELETE
    USING (true);