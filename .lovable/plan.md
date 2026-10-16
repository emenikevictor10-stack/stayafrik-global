# Remove stay counts from search place suggestions

In the search modal's location dropdown, each suggestion shows e.g. "City · 33 stays". Remove the stay-count portion so only the place type ("City", "State", "Neighbourhood") is shown.

## Change

- `src/components/search/SmartSearchBar.tsx` (line ~140): change the subtitle from
  `{kindLabel[e.kind]} · {e.count} {e.count === 1 ? "stay" : "stays"}` to just `{kindLabel[e.kind]}`.

No other behaviour changes — suggestions, grouping, and Partner tags stay the same.
