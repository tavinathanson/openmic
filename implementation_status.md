Feature: Ticketed Shows with Stripe

Component                  | Status        | Notes
--------------------------|---------------|-------------------------------
DB table: shows           | ✅ Created     | For ticketed show details. Migration: 20250516_add_ticketed_shows_tables.sql
DB table: tickets         | ✅ Created     | Linking people to shows, payment status. Migration: 20250516_add_ticketed_shows_tables.sql
DB table: payments        | ✅ Created     | Stripe transaction records. Migration: 20250516_add_ticketed_shows_tables.sql
Types: Show, Ticket, Payment | ✅ Created     | TypeScript definitions in src/lib/types.ts
API: POST /api/shows      | ❌ Not started | Admin: Create show
API: GET /api/shows       | ❌ Not started | List shows
API: GET /api/shows/:id   | ❌ Not started | Show details
API: POST /api/tickets/checkout-session | 🔄 Stubbed     | src/app/api/tickets/checkout-session/route.ts
API: POST /api/stripe-webhook | 🔄 Stubbed     | src/app/api/stripe-webhook/route.ts (needs STRIPE_WEBHOOK_SECRET & email impl)
Component: ShowList       | ❌ Not started | Display list of shows
Component: ShowDetail     | 🔄 Stubbed     | src/app/shows/[id]/page.tsx (fetches show data)
Component: TicketPurchaseButton | 🔄 Stubbed     | src/components/TicketPurchaseButton.tsx (calls checkout API)
Page: Payment Success     | 🔄 Stubbed     | src/app/payment/success/page.tsx
Page: Payment Cancel      | 🔄 Stubbed     | src/app/payment/cancel/page.tsx

Pending:
- Apply DB migration: supabase/migrations/20250516_add_ticketed_shows_tables.sql
- Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to .env
- Add stripe_price_id to `shows` table via Supabase UI for each show you create in Stripe
- Add stripe_customer_id to `people` table (optional, or handled by checkout API)
- Implement `sendTicketConfirmationEmail` in src/lib/resend.ts
- Implement `increment_tickets_sold` Supabase RPC function
- Build ShowList component if needed
- Flesh out UI details and styling
- Test thoroughly! 