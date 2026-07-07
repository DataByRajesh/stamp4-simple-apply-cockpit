-- tracked_jobs.score was created as integer, but the /6-dimension average scoring model (see
-- "Rescale each score dimension to /5 and average them for the verdict") produces decimal totals
-- like 3.8 or 4.2. Saving any job scored under the current model has been failing at the database
-- level with "invalid input syntax for type integer" ever since - discovered while building the
-- analytics module and testing against realistic data, not from an existing tracked job (the one
-- real row predates the rescale and still holds an old integer-scale value).
alter table tracked_jobs alter column score type numeric using score::numeric;
