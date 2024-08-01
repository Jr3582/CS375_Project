const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/env.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'env.json'));
});

wss.on('connection', (ws) => {
    const id = uuidv4();
    console.log(`Client ${id} connected`);
    ws.send(JSON.stringify({ type: 'init', id }));

    ws.on('message', (message) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log(`Client ${id} disconnected`);
    });
});

server.listen(PORT, () => {
    console.log(`Listening at Port ${PORT}`);
});