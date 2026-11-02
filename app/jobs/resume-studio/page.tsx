import { redirect } from 'next/navigation';

export default async function ResumeStudioRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string; sample?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params?.id) query.set('id', params.id);
  if (params?.sample) query.set('sample', params.sample);
  const qStr = query.toString();
  redirect(`/jobs/resume/studio${qStr ? `?${qStr}` : ''}`);
}

