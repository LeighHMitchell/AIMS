import dynamic from 'next/dynamic';

const CoverageSelector = dynamic(
  () => import('./CoverageSelector'),
  { 
    ssr: false,
    loading: () => (
      <div className="p-6 bg-gray-50 animate-pulse rounded-lg">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }
);

export default CoverageSelector; 