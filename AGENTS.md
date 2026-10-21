- Public API (/api/public/v1/*) scopes every read/write to one hotel: internal platform key may name the hotel via X-Site-Org (set by revoo-api.server from resolveSiteOrgId); any other API key is locked to its api_clients.organization_id. Why: guest websites must never show another hotel's rooms or accept bookings for them.

- Hotel staff roles live in organization_members.role and has_role() checks the role in the current hotel; user_roles is only authoritative for platform admins. Why: one person can have different rights in different hotels.
