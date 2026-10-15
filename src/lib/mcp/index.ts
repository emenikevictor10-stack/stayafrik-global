import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getListing from "./tools/get-listing";
import myBookings from "./tools/my-bookings";
import myListings from "./tools/my-listings";
import myNotifications from "./tools/my-notifications";
import whoami from "./tools/whoami";

// Build the direct Supabase issuer from the project ref (never from SUPABASE_URL,
// which may be a proxy URL). VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "stayafrik-living",
  title: "Stayafrik Living",
  version: "0.1.0",
  instructions:
    "Tools for StayGlobal — Africa's verified shortlet platform. Use search_listings to find verified places to stay, get_listing for full details, my_bookings / my_listings / my_notifications for the signed-in user's own data, and whoami to fetch their profile.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchListings, getListing, myBookings, myListings, myNotifications, whoami],
});
