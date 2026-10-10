# ADR 0008: Curiosity Vectors and Discovery Query Hardening

- **Status**: Proposed
- **Date**: 2026-10-09
- **Decision owner**: Agent proposal for Maintainer review (ADR 0001)
- **Scope**: Backend discovery engine, query translation, and domain vectorization roadmap.

## Context

CurioMap maps human curiosity with coarse geolocation (~15 km grid) and strict privacy redactions. The initial implementation focused exclusively on books (`Book`, `BookshelfEntry`). Two architectural challenges emerged:

1. **Discovery Performance & Scalability**:
   `DiscoverController.ComputeGlobalAsync` and `ComputeTopBooksAsync` previously performed unbounded queries (`.ToListAsync()`) loading every registered located user and active bookshelf entry into application memory to execute LINQ in-memory groupings. As the reading graph scales, this table-scan causes memory pressure, GC latency, and excessive network transport between API and PostgreSQL.

2. **Domain Representation: From Flat Catalog to Curiosity Graph**:
   Representing human curiosity purely via discrete book ISBNs fragments discovery. Readers exploring related ideas (e.g., *Cosmology*, *Stoicism*, *Permaculture*) across different editions or titles remain isolated. Furthermore, non-book curiosities (collectibles, coins) present severe privacy hazards (burglary targeting on coordinates) and lack active "consumption" states. Expanding the platform requires topic/vector abstraction and multi-format intellectual media (open papers, documentaries) rather than physical inventory tracking.

## Decisions

### 1. Database-Level Discovery Aggregation (Implemented)

`DiscoverController` now delegates aggregations directly to the database engine:

- **`ComputeTopBooksAsync`**: Applies `.GroupBy(...)`, `.Select(...)`, `.OrderByDescending(...)`, and `.Take(take)` within the EF Core LINQ query prior to `.ToListAsync()`. Sorting and limit bounds are executed by PostgreSQL/SQLite.
- **`ComputeGlobalAsync`**: Aggregates `ActiveReaders` and coordinates (`AvgLat`, `AvgLng`) grouped by `(Country, Region)` directly in SQL. Country-only visibility redaction (`u.LocationVisibility == LocationVisibility.Country ? "" : ...`) is projected within the query, ensuring that region names for country-only readers are never transported or reconstructed.
- Memory allocation for global discovery drops from $O(U + S)$ (all users and active shelf entries) to $O(R + B)$ where $R$ is distinct active regions and $B$ is top books per region.

### 2. Curiosity Vectors Architecture (Roadmap)

To transform CurioMap into a true curiosity graph without violating the ~15 km privacy model:

1. **Subject / Concept Taxonomy**:
   - Ingest normalized subject tags on `Book` entities (e.g., via Open Library subject classifications).
   - Add topic filtering to discovery endpoints (`/discover/global?topic=astrophysics`) to map intellectual currents across regions.
2. **Ambient Regional Pulses**:
   - Weight regional curiosity by recent activity (rolling 7-day window) to surface live trends ("What Berlin is curious about this week") rather than cumulative historical shelves.
3. **Multi-Format Intellectual Media**:
   - Introduce a polymorphic `CuriosityItem` parent model for open intellectual content with identical consumption lifecycles (Wishlist $\rightarrow$ Active $\rightarrow$ Finished):
     - Books (Open Library / ISBN)
     - Open Science / Research Papers (arXiv / OpenAlex DOIs)
     - Documentary Films (TMDB)
   - Exclude high-value physical goods (coins, art, luxury collectibles) to preserve user safety against coordinate-based asset targeting.

## Consequences

- **Positive**:
  - Memory consumption and database transport for discovery queries remain strictly bounded.
  - Query execution times scale with the number of regions rather than total user base.
  - Foundational path established for multi-format curiosity without physical security risks.
- **Negative / Debt**:
  - Direct database `GroupBy` requires queries to remain strictly EF Core-translatable across both PostgreSQL (production) and SQLite (hermetic integration tests).
