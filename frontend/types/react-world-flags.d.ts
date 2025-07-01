declare module 'react-world-flags' {
  import React from 'react';

  interface FlagProps {
    code: string;
    style?: React.CSSProperties;
    className?: string;
    width?: number | string;
    height?: number | string;
    fallback?: React.ReactNode;
  }

  const Flag: React.FC<FlagProps>;
  export default Flag;
} 