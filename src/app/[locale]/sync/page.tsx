import { SyncDashboard } from "@/components/layout/sync-dashboard";

export default async function SyncPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Data Sync Status</h1>
      <p className="text-sm text-gray-500 mb-6">
        Live view of data pipeline progress. Auto-refreshes every 5 seconds.
      </p>
      <SyncDashboard locale={locale} />
    </div>
  );
}
