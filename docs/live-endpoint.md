# Live endpoint boundary

Live endpoint tests are opt-in because external availability, data, authentication, rate limits, and deployment timing are not deterministic pull-request inputs. `RUN_LIVE_GRAPHQL=true` enables a minimal `__typename` probe using `GRAPHQL_ENDPOINT` and an optional runtime token.

CI does not claim live production or staging coverage unless such a job is explicitly invoked with controlled secrets and an approved target.
