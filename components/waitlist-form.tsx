import { useState } from 'react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to join waitlist');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Error joining waitlist');
    }
  }

  if (submitted) {
    return <div className="p-4 text-green-600">Thank you! We’ll be in touch soon.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
      <label htmlFor="waitlist-email" className="block font-medium">Your work email</label>
      <input
        id="waitlist-email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="border px-2 py-1 rounded w-full"
        placeholder="you@company.com"
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Join Waitlist</button>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </form>
  );
}
