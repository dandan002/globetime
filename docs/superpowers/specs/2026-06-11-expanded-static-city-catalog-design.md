# Expanded Static City Catalog Design

## Goal

Increase the number of searchable cities without adding a server, geocoding API, API keys, or network dependency. The app remains a static Vite frontend with all selectable city data bundled at build time.

## Scope

- Expand `src/data/cities.js` from the current curated list to a broader set of major global cities.
- Keep the existing city object contract:

```js
mk("City", "Country", "CC", "IANA/Timezone", lat, lon)
```

- Preserve the existing autocomplete, localStorage persistence, globe markers, copy output, daylight display, and timezone formatting flows.
- Use IANA timezone names only. The app must continue deriving standard-time and daylight-saving offsets through `Intl.DateTimeFormat`.

## Catalog Strategy

Target roughly 150 to 250 total cities. Prioritize:

- Major population and economic centers.
- Better coverage across Africa, South America, Central America, the Caribbean, the Middle East, South Asia, Southeast Asia, East Asia, Oceania, and secondary North American and European cities.
- Cities that add useful timezone coverage, including half-hour and unusual-offset zones where practical.

The catalog should remain human-reviewable. This is a curated product list, not a full world gazetteer.

## Validation

Add focused tests for the city catalog:

- Every city has a stable non-empty `id`, `name`, `country`, `cc`, `tz`, `lat`, and `lon`.
- City IDs are unique.
- Each timezone is accepted by `Intl.DateTimeFormat`.
- Latitude and longitude are finite and within valid ranges.

## Non-Goals

- No geocoding API.
- No server or serverless route.
- No remote autocomplete.
- No custom user-created city editor in this phase.
- No large generated city database.

## Risks

- Incorrect coordinates or timezone names can produce misleading globe placement or time offsets. Tests should catch invalid timezone names, but human review is still needed for geographic accuracy.
- A larger catalog may make search results denser. The existing dropdown should be reused first; UI changes are only needed if verification shows usability or layout problems.
