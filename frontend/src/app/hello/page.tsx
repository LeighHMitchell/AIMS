export default function HelloPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Hello World</h1>
      <p>If you can see this, Next.js is working!</p>
      <p>Time: {new Date().toISOString()}</p>
      <hr />
      <h2>Debug Info:</h2>
      <ul>
        <li>Node version: {process.version}</li>
        <li>Environment: {process.env.NODE_ENV}</li>
      </ul>
    </div>
  );
}