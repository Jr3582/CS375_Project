const express = require('express');
let { Pool } = require("pg");
// make this script's dir the cwd
// b/c npm run start doesn't cd into src/ to run this
// and if we aren't in its cwd, all relative paths will break
process.chdir(__dirname);

let host;

// fly.io sets NODE_ENV to production automatically, otherwise it's unset when running locally
if (process.env.NODE_ENV == "production") {
	host = "0.0.0.0";
	databaseConfig = { connectionString: process.env.DATABASE_URL };
} else {
	host = "localhost";
	let { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT } = process.env;
	databaseConfig = { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT };
}

const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const lobbies = {}; 
const players = {};

const playerStatuses = {};

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

    players[id] = { x: 400, y: 300 };
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

        if (data.type === 'position') {
            // Update the player's position on the server
            players[data.id] = { x: data.x, y: data.y };
    
            // Broadcast the updated position to all clients in the lobby
            if (lobbies[lobby]) {
                Object.keys(lobbies[lobby]).forEach((clientId) => {
                    if (lobbies[lobby][clientId] && lobbies[lobby][clientId].readyState === WebSocket.OPEN) {
                        lobbies[lobby][clientId].send(message);
                    }
                });
            }
        } else if (data.type === 'request_positions') {
            // Respond with all player positions to the requesting client
            Object.keys(players).forEach(playerId => {
                if (lobbies[lobby][playerId] && lobbies[lobby][playerId].readyState === WebSocket.OPEN) {
                    const playerPosition = {
                        type: 'position',
                        id: playerId,
                        x: players[playerId].x,  // Ensure current position is sent
                        y: players[playerId].y   // Ensure current position is sent
                    };
                    ws.send(JSON.stringify(playerPosition));
                }
            });
        }

        if (data.type === 'replayStatus') {
            if (!lobbies[lobby].playerStatuses) {
                lobbies[lobby].playerStatuses = {};
            }
            lobbies[lobby].playerStatuses[data.id] = data.replayReady;

            const allReady = Object.values(playerStatuses).every(status => status);
            if (allReady) {
                // Notify all clients to restart the game
                broadcast({
                    type: 'startReplay'
                });
            } else {
                // Broadcast updated statuses to all clients
                broadcast({
                    type: 'updateReplayStatus',
                    playerStatuses
                });
            }
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

    
function broadcast(message) {
    const messageString = JSON.stringify(message);
    if (lobbies[lobby]) {
        Object.values(lobbies[lobby]).forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    }
}

server.listen(PORT, host, () => {
    console.log(`http://${host}:${PORT}`);
});