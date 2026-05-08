# March Total Mismatch (Client A)


## Debugging 

Looking at `services/reservations.py` end-to-end I found three issues:

- calculate_total_revenue (reservations.py:34-87) — has no date filter at all in its SQL. It sums every reservation ever for the property.
- The function that would filter by month — calculate_monthly_revenue (reservations.py:5-32) — is a stub that returns Decimal('0') and is never wired up.
- The seed contains `res-tz-1` at `2024-02-29 23:30:00+00`, which is `March 1, 00:30` in `Europe/Paris` — a deliberate boundary case the dashboard would mis-bucket once month filtering exists.

Adding the following row confirmed it

```
INSERT INTO reservations VALUES
  ('res-april-1','prop-002','tenant-a',
   '2024-04-10 10:00:00+00','2024-04-12 10:00:00+00',
   500.000, 'USD', NOW());
```

The current code returns `5475.50` (April reservation included)


## The bug

1. No date filter.
1. Dead `calculate_monthly_revenue` function.
1. Currency mixing — non-USD reservations would be summed as if they were USD

## The fix

1. Add month and year query params to dashboard.py and route through a working monthly aggregator.
1. Fix SQL - explicit datae range
1. Group by currency

## Mitigation


- Insert the April row above, refresh, confirm March total stays 4975.50 (not 5475.50). Remove the row.
- For the timezone case, query Sunset/prop-001/March 2024 — res-tz-1 (1250.00) must be included in March (Paris-local), not February (UTC).
- redis-cli FLUSHDB between tries so you're not reading stale cached totals.

```bash
docker compose exec redis redis-cli FLUSHDB
docker compose restart backend
```
