import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { handelStart, handelDisconnect, getType } from './lib';
import { GetTypesResult, room } from './types';

const app = express();
app.use(cors());

// Define the root route for GET requests
app.get("/", (req, res) => {
  res.send("Server is up and running! 🚀");
});

const server = app.listen('8000', () => console.log('Server is up, 8000'));
const io = new Server(server, { cors: { origin: '*' } });

let online: number = 0;
let roomArr: Array<room> = [];

io.on('connection', (socket) => {
  online++;
  io.emit('online', online);

  // on start
  socket.on('start', cb => {
    handelStart(roomArr, socket, cb, io);
  });

  // On disconnection
  socket.on('disconnect', () => {
    online--;
    io.emit('online', online);

    let type = getType(socket.id, roomArr);
    if (type) {
      if (type?.type == 'p1') {
        if (type?.p2id) {
          io.to(type.p2id).emit('stranger-left');
        }
      } else if (type?.type == 'p2') {
        if (type?.p1id) {
          io.to(type.p1id).emit('stranger-left');
        }
      }
    }

    handelDisconnect(socket.id, roomArr, io);
  });

  // ------- logic for webrtc connection ------
  socket.on('ice:send', ({ candidate }) => {
    let type = getType(socket.id, roomArr);
    if (type) {
      if (type?.type == 'p1') {
        typeof (type?.p2id) == 'string' && io.to(type.p2id).emit('ice:reply', { candidate, from: socket.id });
      } else if (type?.type == 'p2') {
        typeof (type?.p1id) == 'string' && io.to(type.p1id).emit('ice:reply', { candidate, from: socket.id });
      }
    }
  });

  // on sdp send
  socket.on('sdp:send', ({ sdp }) => {
    let type = getType(socket.id, roomArr);
    if (type) {
      if (type?.type == 'p1') {
        typeof (type?.p2id) == 'string' && io.to(type.p2id).emit('sdp:reply', { sdp, from: socket.id });
      }
      if (type?.type == 'p2') {
        typeof (type?.p1id) == 'string' && io.to(type.p1id).emit('sdp:reply', { sdp, from: socket.id });
      }
    }
  });

  // Send messages
  socket.on('send-message', (input, type, roomid) => {
    if (type == 'p1') type = 'You: ';
    else if (type == 'p2') type = 'Stranger: ';
    socket.to(roomid).emit('get-message', input, type);
  });

  // "Next" Functionality
  socket.on('next', () => {
    let type = getType(socket.id, roomArr);

    if (type) {
      const targetId = type.type === 'p1' ? type.p2id : type.p1id;

      if (targetId) {
        io.to(targetId).emit('stranger-left');
      }

      handelDisconnect(socket.id, roomArr, io);
      handelStart(roomArr, socket, () => {}, io); // Find a new match
    }
  });
});
