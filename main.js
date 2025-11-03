const { program } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

program
  .option('-h, --host <address>', 'адреса сервера')
  .option('-p, --port <number>', 'порт сервера')
  .option('-c, --cache <path>', 'шлях до директорії кешу');

program.parse(process.argv);
const options = program.opts();

if (!options.host) {
  console.error("Помилка: не задано обов'язковий параметр --host");
  process.exit(1);
}
if (!options.port) {
  console.error("Помилка: не задано обов'язковий параметр --port");
  process.exit(1);
}
if (!options.cache) {
  console.error("Помилка: не задано обов'язковий параметр --cache");
  process.exit(1);
}

fs.mkdir(options.cache, { recursive: true }).catch(err => {
  console.error('Помилка створення директорії кешу:', err);
});

const server = http.createServer(async (req, res) => {
  const statusCode = req.url.split('/')[1];
  
  if (!statusCode || isNaN(statusCode)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Невірний статусний код');
    return;
  }

  const cachePath = path.join(options.cache, `${statusCode}.jpg`);

  try {
    switch (req.method) {
      case 'GET':
        try {
          const image = await fs.readFile(cachePath);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(image);
        } catch (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Картинку не знайдено в кеші');
        }
        break;

      case 'PUT':
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          try {
            await fs.writeFile(cachePath, Buffer.concat(chunks));
            res.writeHead(201, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Картинку збережено в кеш');
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Помилка збереження');
          }
        });
        break;

      case 'DELETE':
        try {
          await fs.unlink(cachePath);
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Картинку видалено з кешу');
        } catch (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Картинку не знайдено в кеші');
        }
        break;

      default:
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Метод не підтримується');
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Внутрішня помилка сервера');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Проксі-сервер запущено на http://${options.host}:${options.port}`);
});