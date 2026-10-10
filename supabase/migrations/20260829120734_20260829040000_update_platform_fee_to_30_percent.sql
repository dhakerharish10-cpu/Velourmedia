/*
# Update platform fee from 10% to 30%

Updates the default platform_fee_percent in platform_settings from 10.00 to 30.00.
This means creators receive 70% net revenue on all sales.
*/

UPDATE platform_settings
SET platform_fee_percent = 30.00
WHERE id = 1;

-- Also update the column default for future inserts
ALTER TABLE platform_settings ALTER COLUMN platform_fee_percent SET DEFAULT 30.00;
