import SimpleMapTest from '@/components/SimpleMapTest';

export default function TestMapDebugPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🗺️ Map Debug Test Page</h1>
      <p className="text-gray-600 mb-4">
        This page tests the map functionality in isolation to help debug scrolling/panning issues.
      </p>
      <SimpleMapTest />
    </div>
  );
}