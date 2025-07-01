import dynamic from 'next/dynamic';

const EnhancedCoverageSelector = dynamic(
  () => import('./EnhancedCoverageSelector'),
  { 
    ssr: false,
    loading: () => (
      <div className="p-6 bg-gray-50 animate-pulse rounded-lg">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="h-80 bg-gray-200 rounded"></div>
      </div>
    )
  }
);

export default EnhancedCoverageSelector; 