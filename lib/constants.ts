export const CATEGORIES = [
  { value: 'housing', label: 'Housing' },
  { value: 'buy_sell', label: 'Buy / Sell' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'jobs', label: 'Jobs' },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All Companies' },
  { value: 'company', label: 'My Company Only' },
] as const;

export const SUB_CATEGORIES: Record<string, { value: string; label: string }[]> = {
  housing: [
    { value: 'flatmates', label: 'Flatmates' },
    { value: 'rentals', label: 'Rentals' },
    { value: 'sale', label: 'Sale' },
    { value: 'pg', label: 'PG' },
  ],
  jobs: [
    { value: 'hiring', label: 'Looking to hire' },
    { value: 'seeking_referral', label: 'Seeking referral' },
    { value: 'offering_referral', label: 'Offering referral' },
    { value: 'seeking_job', label: 'Seeking job' },
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
];

export const REPORT_REASONS = [
  'Spam or misleading',
  'Inappropriate content',
  'Broker activity',
  'Harassment',
  'Other',
];
