# See a host's listings from Users

## What changes
1. **Users table:** for hosts, the Listings number becomes a link, and the three-dot menu gets a "View listings" item. Both open that person's details page, scrolled to their listings.
2. **Person details page:** hosts get a new "Listings" section listing every stay they own. Each row shows:
   - the photo, title and listing ID
   - the place, as city and neighbourhood
   - the price per night
   - the status: Pending, Approved or Paused
   - the date it was added

   Clicking a row opens that stay in Admin Listings, already filtered to it. Each row also has a three-dot menu with "Open stay page" and "Copy listing ID".
3. **Admin Listings:** accepts a host filter in the page link. Opening it from a person shows only their stays, with a "Host: Name ×" chip to clear the filter.
4. Guests (non-hosts) don't see the Listings section or the menu item.

## Technical notes
- `AdminUserDetail.tsx`: query `listings` (id, title, listing_code, images, city, neighborhood, price_per_night, verified, is_available, created_at) by `host_id`, newest first, in a `#listings` anchor section using the existing table styling.
- `AdminUsers.tsx`: link to `/admin/users/:id#listings`.
- `AdminListings.tsx`: read `?host=<user_id>` from the page link and filter on `host_id`. The clear chip removes the param.
- No database changes; admin can already read all listings.
