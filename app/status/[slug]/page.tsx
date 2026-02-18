import { MonitorDetail } from "@/components/monitor-detail";

export default async function MonitorStatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <MonitorDetail slug={slug} />
    </main>
  );
}

