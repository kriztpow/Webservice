const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = new Map();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const roomId = url.searchParams.get('roomId');
    const role = url.searchParams.get('role');

    if (!roomId || !role) {
        ws.close();
        return;
    }

    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
    }
    const room = rooms.get(roomId);

    const existing = room.get(role);
    if (existing) {
        existing.close();
    }

    room.set(role, ws);
    console.log(`[${roomId}] ${role} conectado`);

    ws.on('message', (data, isBinary) => {
        if (role === 'server') {
            room.forEach((clientWs, clientRole) => {
                if (clientRole.startsWith('web') && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(data, { binary: true });
                }
            });
        } else if (role.startsWith('web')) {
            const serverWs = room.get('server');
            if (serverWs && serverWs.readyState === WebSocket.OPEN) {
                serverWs.send(data.toString());
            }
        }
    });

    ws.on('close', () => {
        console.log(`[${roomId}] ${role} desconectado`);
        room.delete(role);
        if (room.size === 0) {
            rooms.delete(roomId);
        }
    });

    ws.on('error', (err) => {
        console.error(`[${roomId}] Error en ${role}:`, err.message);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Servidor Relay WebSocket corriendo en puerto ${PORT}`);
});
