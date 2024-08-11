const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const lobbies = {}; 

app.use(express.static('public'));

app.get('/env.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'env.json'));
});

wss.on('connection', (ws, req) => {
    const id = uuidv4();
    const params = new URLSearchParams(req.url.split('?')[1]);
    const lobby = params.get('lobby');
    
    console.log(`Client ${id} connected to lobby ${lobby}`);
    
    if (!lobbies[lobby]) {
        lobbies[lobby] = {};
    }
    lobbies[lobby][id] = ws;

    ws.send(JSON.stringify({ type: 'init', id }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (lobbies[lobby]) {
            Object.keys(lobbies[lobby]).forEach((clientId) => {
                if (lobbies[lobby][clientId].readyState === WebSocket.OPEN) {
                    lobbies[lobby][clientId].send(message);
                }
            });
        }
    });

    ws.on('close', () => {
        console.log(`Client ${id} disconnected from lobby ${lobby}`);
        delete lobbies[lobby][id];
        if (Object.keys(lobbies[lobby]).length === 0) {
            delete lobbies[lobby];
        }
    });
});

server.listen(PORT, () => {
    console.log(`Listening at Port ${PORT}`);
});
