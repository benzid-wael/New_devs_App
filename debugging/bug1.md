# Cross-Tenant Cache Leak (Privacy)

## Debugging
- Looking at both dashboard initially, I saw that we saw the same result, I thought it's wrong
- checking response, look like we are returning same result
- I cecked the code (RevenueSummary.tsx → dashboard.py → services/cache.py → services/reservations.py), I found bad redis key
- I checked schema as well, I found that `properties` has composite PK (id, tenant_id) — meaning prop-001 exists for both tenants


## Fix

cache_key = f"revenue:{tenant_id}:{property_id}"


## Mitigation

- One-time redis-cli `FLUSHDB` to evict already-poisoned entries.
docker compose restart backend to load the new code.
- Verified redis-cli KEYS 'revenue:*' now shows separate `revenue:tenant-a:prop-001` and `revenue:tenant-b:prop-001` entries after each tenant loads.