"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const lib_1 = require("./lib");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// Define the root route for GET requests
app.get("/", (req, res) => {
    res.send("Server is up and running! 🚀");
});
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => console.log(`Server is up on port ${PORT}`));
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
let online = 0;
let roomArr = [];
io.on('connection', (socket) => {
    online++;
    io.emit('online', online);
    // on start
    socket.on('start', (cb) => {
        (0, lib_1.handelStart)(roomArr, socket, cb, io);
    });
    // On disconnection
    socket.on('disconnect', () => {
        online--;
        io.emit('online', online);
        let type = (0, lib_1.getType)(socket.id, roomArr);
        if (type) {
            if ((type === null || type === void 0 ? void 0 : type.type) == 'p1') {
                if (type === null || type === void 0 ? void 0 : type.p2id) {
                    io.to(type.p2id).emit('stranger-left');
                }
            }
            else if ((type === null || type === void 0 ? void 0 : type.type) == 'p2') {
                if (type === null || type === void 0 ? void 0 : type.p1id) {
                    io.to(type.p1id).emit('stranger-left');
                }
            }
        }
        (0, lib_1.handelDisconnect)(socket.id, roomArr, io);
    });
    // ------- logic for webrtc connection ------
    socket.on('ice:send', ({ candidate }) => {
        let type = (0, lib_1.getType)(socket.id, roomArr);
        if (type) {
            if ((type === null || type === void 0 ? void 0 : type.type) == 'p1') {
                typeof (type === null || type === void 0 ? void 0 : type.p2id) == 'string' && io.to(type.p2id).emit('ice:reply', { candidate, from: socket.id });
            }
            else if ((type === null || type === void 0 ? void 0 : type.type) == 'p2') {
                typeof (type === null || type === void 0 ? void 0 : type.p1id) == 'string' && io.to(type.p1id).emit('ice:reply', { candidate, from: socket.id });
            }
        }
    });
    // on sdp send
    socket.on('sdp:send', ({ sdp }) => {
        let type = (0, lib_1.getType)(socket.id, roomArr);
        if (type) {
            if ((type === null || type === void 0 ? void 0 : type.type) == 'p1') {
                typeof (type === null || type === void 0 ? void 0 : type.p2id) == 'string' && io.to(type.p2id).emit('sdp:reply', { sdp, from: socket.id });
            }
            if ((type === null || type === void 0 ? void 0 : type.type) == 'p2') {
                typeof (type === null || type === void 0 ? void 0 : type.p1id) == 'string' && io.to(type.p1id).emit('sdp:reply', { sdp, from: socket.id });
            }
        }
    });
    // Send messages
    socket.on('send-message', (input, type, roomid) => {
        if (type == 'p1')
            type = 'You: ';
        else if (type == 'p2')
            type = 'Stranger: ';
        socket.to(roomid).emit('get-message', input, type);
    });
    // "Next" Functionality
    socket.on('next', () => {
        let type = (0, lib_1.getType)(socket.id, roomArr);
        if (type) {
            const targetId = type.type === 'p1' ? type.p2id : type.p1id;
            if (targetId) {
                io.to(targetId).emit('stranger-left');
            }
            (0, lib_1.handelDisconnect)(socket.id, roomArr, io);
            (0, lib_1.handelStart)(roomArr, socket, () => { }, io); // Find a new match
        }
    });
});
