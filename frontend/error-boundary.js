// Simple error boundary to catch crashes
const withErrorBoundary = (Component) => {
  return function ErrorBoundaryWrapper(props) {
    try {
      return <Component {...props} />;
    } catch (error) {
      console.error('Component crashed:', error);
      return <div>Something went wrong. Check console.</div>;
    }
  };
};

module.exports = withErrorBoundary;