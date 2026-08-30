export const CATEGORIES = [
  { value: 'housing', label: 'Housing' },
  { value: 'buy_sell', label: 'Buy / Sell' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'referrals', label: 'Referrals' },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public (Web & Search Engines)' },
  { value: 'all', label: 'Verified Network (All Companies)' },
  { value: 'company', label: 'My Company Only' },
] as const;

export const SUB_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  housing: [
    { value: 'flatmates', label: 'Flatmates' },
    { value: 'rentals', label: 'Rentals' },
    { value: 'sale', label: 'Sale' },
    { value: 'pg', label: 'PG' },
  ],
  referrals: [
    { value: 'seeking_referral', label: 'Seeking referral' },
    { value: 'offering_referral', label: 'Offering Referral' },
  ],
};

export const INDIAN_CITIES = [
  'Ahmedabad',
  'Bangalore',
  'Chandigarh',
  'Chennai',
  'Delhi',
  'Gurgaon',
  'Hyderabad',
  'Indore',
  'Jaipur',
  'Kochi',
  'Kolkata',
  'Lucknow',
  'Mumbai',
  'Noida',
  'Pune',
  'Surat',
  'Other',
  'Coimbatore',
  'Bhubaneswar',
  'Nagpur',
  'Vadodara',
  'Visakhapatnam',
  'Thiruvananthapuram',
  'Mysuru',
  'Bhopal',
  'Dubai',
  'Singapore',
  'London',
  'New York',
  'San Francisco',
  'Toronto',
  'Sydney',
  'Berlin',
  'Paris',
  'Tokyo',
  'Seoul',
  'Shanghai',
  'Hong Kong',
];

export const REPORT_REASONS = [
  'Spam or misleading',
  'Inappropriate content',
  'Broker activity',
  'Harassment',
  'Other',
];
