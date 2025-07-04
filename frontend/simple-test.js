const http = require('http');

console.log('Creating simple HTTP server...');

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  res.writeHead(200, { 
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(`
    <html>
      <body>
        <h1>Simple Test Server Works!</h1>
        <p>Time: ${new Date().toISOString()}</p>
        <p>URL: ${req.url}</p>
        <p>If you can see this, basic HTTP is working.</p>
      </body>
    </html>
  `);
});

const PORT = 9999;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running at:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://127.0.0.1:${PORT}`);
  console.log(`  http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

// Keep alive
setInterval(() => {
  console.log('Server still running...');
}, 5000);