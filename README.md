# Vouchins

A trust-based, Slack-like community platform for verified corporate employees to ask for recommendations, post buy/sell requirements, find housing, and share trusted suggestions.

## Key Features

- **Verified Users Only**: Corporate email verification required (no Gmail, Yahoo, etc.)
- **Trust-First Design**: Real names, real companies, transparent identity
- **Text-First UI**: Clean, Slack-like interface focused on readability
- **Categories**: Housing, Buy/Sell, Recommendations
- **Visibility Control**: Post to your company only or all companies
- **Auto-Moderation**: Automatic flagging of suspicious content (phone numbers, broker keywords)
- **Admin Dashboard**: Complete moderation tools for reviewing reports and managing content

## Tech Stack

- **Frontend**: Next.js 13 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth with email verification
- **Deployment**: Vercel-ready

## Database Schema

### Tables

1. **companies** - Corporate domains and names
2. **users** - User profiles with company association
3. **posts** - Community posts with categories and visibility
4. **comments** - Single-level comment threading
5. **reports** - User-reported content for moderation

### Security

- Row Level Security (RLS) enabled on all tables
- Email verification required before posting
- Company-only posts visible only to company members
- Admin-only access to reports and moderation tools

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (already configured)

### Environment Variables

The project comes pre-configured with Supabase credentials in `.env`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Installation

1. Install dependencies:

```bash
npm install
```

2. The database migrations have already been applied. The schema includes:
   - User authentication and profiles
   - Company management
   - Posts with categories and visibility
   - Comments system
   - Reports and moderation

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage Guide

### For Users

1. **Sign Up**
   - Use your corporate email (personal email domains are blocked)
   - Verify your email via the link sent to your inbox
   - Complete onboarding by selecting your city

2. **Create a Post**
   - Click "New Post" on the feed
   - Select category: Housing, Buy/Sell, or Recommendations
   - Choose visibility: All Companies or My Company Only
   - Write your request (text-first, no titles needed)

3. **Interact**
   - Reply to posts (single-level threading)
   - Report inappropriate content
   - Filter by category or visibility

### For Admins

1. Access the admin dashboard from the navigation menu (Shield icon)
2. Review reports:
   - See all user-reported posts and comments
   - Mark as reviewed or dismissed
   - Remove posts if needed
3. Monitor auto-flagged content:
   - Posts with phone numbers
   - Posts with broker-like keywords
4. Manage users:
   - Disable problematic accounts
   - Review user activity

## Auto-Moderation Rules

Posts are automatically flagged if they contain:

- Phone numbers (10-digit patterns)
- Broker-like keywords: "broker", "commission", "brokerage", "deal", "urgent", "limited offer", "100% guaranteed"

Flagged posts remain visible but are highlighted for admin review.

## Key Design Principles

1. **Trust Over Growth**: Only verified corporate emails allowed
2. **Text-First**: No flashy UI, focus on content
3. **Professional**: Calm, enterprise-grade aesthetic
4. **Transparent**: Real names, real companies displayed
5. **Simple**: Minimal features, maximum clarity

## Folder Structure

```
├── app/
│   ├── page.tsx              # Landing page
│   ├── signup/               # Signup flow
│   ├── login/                # Login page
│   ├── verify-email/         # Email verification
│   ├── onboarding/           # City selection
│   ├── feed/                 # Main feed
│   ├── admin/                # Admin dashboard
│   └── auth/callback/        # Auth callback handler
├── components/
│   ├── navigation.tsx        # Header navigation
│   ├── post-card.tsx         # Post display
│   ├── create-post-dialog.tsx
│   ├── comment-form.tsx
│   ├── report-dialog.tsx
│   └── filter-bar.tsx
├── lib/
│   ├── supabase/
│   │   └── client.ts         # Supabase client
│   ├── auth/
│   │   ├── validation.ts     # Email validation
│   │   └── session.ts        # Session helpers
│   └── constants.ts          # App constants
└── components/ui/            # shadcn/ui components
```

## API Design

All data operations use Supabase client-side SDK with RLS policies for security:

- **Posts**: Create, read, update, delete (with ownership checks)
- **Comments**: Single-level threading, owner can edit/delete
- **Reports**: Users can report, only admins can view/manage
- **Users**: Profile updates, admin can disable accounts

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Environment variables are automatically configured
4. Deploy

The app is production-ready with:
- Optimized Next.js build
- Static page generation where possible
- Efficient database queries with indexes
- Proper error handling

## Security Considerations

1. **Email Verification**: Mandatory before any posting
2. **Corporate Emails Only**: Public domains blocked at validation level
3. **RLS Policies**: Database-level security for all tables
4. **No Anonymous Posts**: All content tied to verified users
5. **Admin Review**: All reports require human review (no auto-bans)

## Future Enhancements (Not in MVP)

The following were intentionally excluded from MVP:

- Direct messaging / chat
- Payments integration
- Ratings and reviews
- AI recommendations
- Mobile app
- Specialist onboarding
- Gamification features

## Support

For issues or questions, check:
1. Database migrations are applied correctly
2. Environment variables are set
3. Supabase project is active
4. Corporate email verification is working

## License

Proprietary - All rights reserved

---

Built with focus on trust, simplicity, and professional collaboration.
