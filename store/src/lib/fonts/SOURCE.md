# Font provenance

- `Inter-Regular.ttf`, `Inter-SemiBold.ttf` — [Inter](https://fonts.google.com/specimen/Inter), OFL-1.1 licensed.
- `PlayfairDisplay-Bold.ttf` — [Playfair Display](https://fonts.google.com/specimen/Playfair+Display), OFL-1.1 licensed.

Both are freely redistributable under the SIL Open Font License. Fetched as static TTF
files directly from Google's font-serving CDN (not the `google/fonts` source repo, which
only publishes variable-axis `.ttf` files for these two families — `@react-pdf/renderer`
needs distinct static weight files, not a variable font, for reliable rendering).

Used by `store/src/lib/invoice-pdf.tsx` (spec 004, User Story 4) to match the store's
brand typography in the PDF invoice attached to payment-confirmation emails.
