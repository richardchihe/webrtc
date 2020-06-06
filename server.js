require('dotenv').config();

const express = require('express');
const favicon = require("serve-favicon");

var io = require('socket.io')
({
    path: '/io/webrtc'
});

const app = express();
const port = process.env.SERVER_PORT;

app.use(favicon(__dirname + '/build/Favicon.ico'));
app.use(express.static(__dirname + '/build'));
// default room
app.get('/', (req, res, next) => { 
    res.sendFile(__dirname + '/build/index.html')
});

app.get('/:room', (req, res, next) => {
    res.sendFile(__dirname + '/build/index.html')
});

const server = app.listen(port, () => console.log(`Example app listening on port ${port}`));

const rooms = {};

// listen to incoming connetions
io.listen(server);
const roomPeers = io.of('/roomPeer');
const lobbyPeers = io.of('/lobbyPeer');

// keep a reference of all socket connections
let connectedLobbyPeers = new Map();

roomPeers.on('connection', socket => {
    const room = socket.handshake.query.room;

    const newRoom = (_room) => {
        for (const [_socketID, _socket] of connectedLobbyPeers.entries()) {
            _socket.emit('peer-disconnected', {
                peerCount: connectedLobbyPeers.size,
                rooms: [...Object.keys(rooms), _room]
            });
        }
        return (new Map()).set(socket.id, socket);
    }

    rooms[room] = rooms[room] && rooms[room].set(socket.id, socket) ||
        newRoom(room);

    // upon connection send current connections to connectee
    socket.emit('connection-success', {
        success: socket.id,
        peerCount: rooms[room].size
    });

    const broadcast = () => {
        const _connectedPeers = rooms[room];

        for (const [socketID, _socket] of _connectedPeers.entries()) {
            if (socketID !== socket.id) {
                _socket.emit('joined-peers', {
                    peerCount: rooms[room].size
                });
            }
        }
    }
    broadcast();

    const disconnectedPeer = (socketID) => {
        const _connectedPeers = rooms[room];

        for (const [_socketID, _socket] of _connectedPeers.entries()) {
            _socket.emit('peer-disconnected', {
                peerCount: rooms[room].size,
                socketID
            });
        }

        if (rooms[room].size === 0) {
            delete rooms[room];
            for (const [_socketID, _socket] of connectedLobbyPeers.entries()) {
                _socket.emit('peer-disconnected', {
                    peerCount: connectedLobbyPeers.size,
                    rooms: Object.keys(rooms)
                });
            }
        }
    }

    // upon disconnection send updated connections to all connected
    socket.on('disconnect', () => {
        // remove disconnected socket from rooms[room]
        rooms[room].delete(socket.id);
        disconnectedPeer(socket.id);
    });

    // when newly connected users asks for other users
    socket.on('onlinePeers', (data) => {
        const _connectedPeers = rooms[room];

        // send socketID of each connected user except the one asking
        for (const [socketID, _socket] of _connectedPeers.entries()) {
            if (socketID !== data.socketID.local) {
                socket.emit('online-peer', socketID);
            }
        }
    });

    // when a pc receive icecandidates send them to other pc's
    socket.on('candidate', (data) => {
        const _connectedPeers = rooms[room];

        for (const [socketID, socket] of _connectedPeers.entries()) {
            if (socketID === data.socketID.remote) {
                socket.emit('candidate', {
                    candidate: data.payload,
                    socketID: data.socketID.local
                });
            }
        }
    });

    // when a pc creates an offer send created sdp to other pc's
    socket.on('offer', data => {
        const _connectedPeers = rooms[room];

        for (const [socketID, socket] of _connectedPeers.entries()) {
            if (socketID === data.socketID.remote) {
                socket.emit('offer', {
                    sdp: data.payload,
                    socketID: data.socketID.local
                });
            }
        }
    });

    // when a pc creates an answer send created sdp to other pc's
    socket.on('answer', data => {
        const _connectedPeers = rooms[room];

        for (const [socketID, socket] of _connectedPeers.entries()) {
            if (socketID === data.socketID.remote) {
                socket.emit('answer', {
                    sdp: data.payload,
                    socketID: data.socketID.local
                });
            }
        }
    });

});

lobbyPeers.on('connection', socket => {
    connectedLobbyPeers.set(socket.id, socket);

    // upon connection send current lobby connections to connectee
    socket.emit('connection-success', {
        success: socket.id,
        peerCount: connectedLobbyPeers.size,
        rooms: Object.keys(rooms)
    });

    const broadcast = () => socket.broadcast.emit('joined-peers', {
        peerCount: connectedLobbyPeers.size
    });
    broadcast();

    const disconnectedPeer = (socketID) => {
        for (const [_socketID, _socket] of connectedLobbyPeers.entries()) {
            _socket.emit('peer-disconnected', {
                peerCount: connectedLobbyPeers.size,
                rooms: Object.keys(rooms),
                socketID
            });
        }
    }

    // upon disconnection send updated connectedLobbyPeers to all lobby connections
    socket.on('disconnect', () => {
        // remove disconnected socket from connectedLobbyPeers
        connectedLobbyPeers.delete(socket.id);
        disconnectedPeer(socket.id);
    });
});