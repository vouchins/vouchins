export const CATEGORIES = [
  { value: 'housing', label: 'Housing' },
  { value: 'buy_sell', label: 'Buy / Sell' },
  { value: 'recommendations', label: 'Recommendations' },
] as const;

export const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All Companies' },
  { value: 'company', label: 'My Company Only' },
] as const;

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
].sort();

export const REPORT_REASONS = [
  'Spam or misleading',
  'Inappropriate content',
  'Broker activity',
  'Harassment',
  'Other',
];
