const http = require('http');

const server = http.createServer((req, res) => {
  console.log(req.method + ' ' + req.url);
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    if (body) console.log('Body:', body.substring(0, 500));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: '200', auth: 'true', message: 'OK' }));
  });
});

server.listen(3000, '0.0.0.0', () => console.log('Debug server na porta 3000'));