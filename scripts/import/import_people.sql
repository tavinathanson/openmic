-- Create a temporary table to load the CSV data
CREATE TEMP TABLE temp_people (
    name TEXT,
    email TEXT
);

-- Create a table to log results
CREATE TEMP TABLE import_log (
    email TEXT,
    status TEXT,
    message TEXT
);

-- Copy data from CSV into temporary table using \copy
\copy temp_people(name, email) FROM PROGRAM 'cat "$CSV_FILE"' WITH (FORMAT csv, HEADER true);

-- Insert only new records, skip duplicates
WITH inserted AS (
    INSERT INTO people (email, full_name)
    SELECT 
        email,
        name
    FROM temp_people
    ON CONFLICT (email) DO NOTHING
    RETURNING email, 'inserted' as status
)
INSERT INTO import_log (email, status, message)
SELECT 
    email,
    status,
    'Successfully imported new record'
FROM inserted;

-- Log skipped records (duplicates)
INSERT INTO import_log (email, status, message)
SELECT 
    t.email,
    'skipped' as status,
    'Skipped - email already exists'
FROM temp_people t
LEFT JOIN import_log l ON t.email = l.email
WHERE l.email IS NULL;

-- Show import results
SELECT status, COUNT(*) as count, message
FROM import_log
GROUP BY status, message
ORDER BY status;

-- Drop the temporary tables
DROP TABLE temp_people;
DROP TABLE import_log; 