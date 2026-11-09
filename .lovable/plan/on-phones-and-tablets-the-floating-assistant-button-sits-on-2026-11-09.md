On phones and tablets, the floating assistant button sits on top of the "Book stay" button, so it covers part of the button's text.

- On stay pages and checkout, move the assistant button up so it sits clear above the Book bar instead of covering it.
- "Book stay" will always show in full, on one line.
- Check on phone and tablet.

Technical: in `AIAssistant.tsx`, use `useLocation`. On `/stays/:id`, `/property/:id` and checkout routes below `lg`, raise the button to about `bottom-28` so it clears the fixed bar in `PropertyDetail.tsx`. Add `whitespace-nowrap` to the Book stay button.
