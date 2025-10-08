const http = require('http');
const url = require('url');
const path = require('path');

const Config = require('./config/Config');
const SpotifyClient = require('./services/SpotifyClient');
const TemplateManager = require('./services/TemplateManager');
const SVGGenerator = require('./services/SVGGenerator');

try {
    Config.load();
    Config.validate();
    console.log('✓ Configurações carregadas com sucesso!');
} catch (error) {
    console.error('✗ Erro ao carregar configurações:', error.message);
    process.exit(1);
}

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (pathname === '/health' || pathname === '/') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'OK',
            message: 'Spotify Now Playing API is running',
            endpoints: {
                svg: '/api?type=svg',
                json: '/api?type=json',
                'with colors': '/api?type=svg&background_color=000000&border_color=1DB954'
            }
        }, null, 2));
        return;
    }

    if (pathname === '/api' || pathname === '/api/') {
        try {
            const query = parsedUrl.query;
            const outputType = (query.type || 'svg').toLowerCase();
            const backgroundColor = query.background_color || '181414';
            const borderColor = query.border_color || '181414';

            const spotifyClient = new SpotifyClient();
            const templatesPath = path.join(__dirname, 'templates');
            const templateManager = new TemplateManager(templatesPath);
            const svgGenerator = new SVGGenerator(spotifyClient, templateManager);

            if (outputType === 'json') {
                const data = await svgGenerator.getData();

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 's-maxage=1');
                res.writeHead(200);
                res.end(JSON.stringify(data, null, 2));
            } else {
                const svg = await svgGenerator.generate(backgroundColor, borderColor);

                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 's-maxage=1');
                res.writeHead(200);
                res.end(svg);
            }
        } catch (error) {
            console.error('Error in /api endpoint:', error);
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(500);
            res.end(JSON.stringify({
                error: 'Internal Server Error',
                message: error.message
            }, null, 2));
        }
        return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(404);
    res.end(JSON.stringify({
        error: 'Not Found',
        message: 'Endpoint not found. Try /api or /health'
    }, null, 2));
});

server.listen(PORT, () => {
    console.log('\n🎵 Spotify Now Playing API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/health`);
    console.log(`✓ SVG endpoint: http://localhost:${PORT}/api?type=svg`);
    console.log(`✓ JSON endpoint: http://localhost:${PORT}/api?type=json`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});