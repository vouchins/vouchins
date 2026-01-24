export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">About Vouchins</h1>
      <p className="text-lg text-muted-foreground mb-4">
        Vouchins is a private, verified marketplace built specifically for corporate employees.
      </p>
      <div className="space-y-6 text-neutral-700 leading-relaxed">
        <p>
          We started with a simple observation: the most reliable recommendations come from people we work with. Whether it's finding a flatmate, buying a used laptop, or hiring a driver, the "vouch" of a colleague is worth more than a thousand anonymous reviews.
        </p>
        <h2 className="text-xl font-semibold text-neutral-900">Our Mission</h2>
        <p>
          To eliminate scams and broker interference by creating a "Circle of Trust" where every user is verified via their professional credentials.
        </p>
      </div>
    </div>
  );
}