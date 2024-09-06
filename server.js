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
    const id = generatePlayerId();
    const params = new URLSearchParams(req.url.split('?')[1]);
    const lobby = params.get('lobby');
    
    console.log(`Client ${id} connected to lobby ${lobby}`);
    
    if (!lobbies[lobby]) {
        lobbies[lobby] = {};
    }
    lobbies[lobby][id] = ws;

    players[id] = { x: 400, y: 300, kills: 0 };  
    ws.send(JSON.stringify({ type: 'init', id }));

    let gameTimer = 90; // One and a half minutes timer

    let interval = setInterval(() => {
        gameTimer--;
        if (gameTimer <= 0) {
            clearInterval(interval);

            // Send message to clients to navigate to the next page
            if (lobbies[lobby]) {
                Object.keys(lobbies[lobby]).forEach((clientId) => {
                    if (lobbies[lobby][clientId].readyState === WebSocket.OPEN) {
                        lobbies[lobby][clientId].send(JSON.stringify({ type: 'navigate', url: '/gameover.html' }));
                    }
                });
            }

            endGame(lobby);
        }
        broadcast({ type: 'update_timer', timeLeft: gameTimer }, lobby);
    }, 1000);

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
        } else if(data.type === 'mouse_position') {
            broadcast(data);
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
        } else if (data.type === 'death') {
            if (players[data.killerId]) {
                if (isNaN(players[data.killerId].kills)) {
                    players[data.killerId].kills = 0;  // Reset kills to 0 if NaN
                }
                players[data.killerId].kills += 1;  // Increment the killer's kills
                console.log(`Player ${data.killerId} has ${players[data.killerId].kills} kills`);  // Log kill count
            }
        }
    });

    ws.on('close', () => {
    console.log(`Client ${id} disconnected from lobby ${lobby}`);

    // Ensure the lobby exists before attempting to delete the player
    if (lobbies[lobby] && lobbies[lobby][id]) {
        delete lobbies[lobby][id];  // Remove the player from the lobby

        // If the lobby is empty, remove the lobby
        if (Object.keys(lobbies[lobby]).length === 0) {
            console.log(`Lobby ${lobby} is empty, deleting it`);
            delete lobbies[lobby];
        }
    } else {
        console.log(`Lobby ${lobby} or Player ${id} does not exist.`);
    }

    // Also ensure the player is deleted from the players object
    if (players[id]) {
        delete players[id];
    }
});
});

    
function broadcast(message, lobby) {
    const messageString = JSON.stringify(message);
    if (lobbies[lobby]) {
        Object.values(lobbies[lobby]).forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    }
}

function endGame(lobby) {
    // Ensure the lobby exists before accessing it
    if (!lobbies[lobby]) {
        console.log(`Lobby ${lobby} does not exist. Cannot end game.`);
        return;
    }

    // Create an array of players with their kill counts
    const playerKillCounts = Object.keys(players).map(playerId => ({
        id: playerId,
        kills: players[playerId].kills,
    }));

    // Send the game over message with the kill data
    broadcast({
        type: 'game_over',
        playerKillCounts: playerKillCounts
    }, lobby);

    // Check again if the lobby exists and clear player data for this lobby
    console.log(`Resetting data for lobby ${lobby}`);
    if (lobbies[lobby]) {
        Object.keys(lobbies[lobby]).forEach(playerId => {
            delete players[playerId];
        });

        // Remove the lobby itself
        delete lobbies[lobby];
    } else {
        console.log(`Lobby ${lobby} was already deleted.`);
    }
}


function generatePlayerId() {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

server.listen(PORT, host, () => {
    console.log(`http://${host}:${PORT}`);
});