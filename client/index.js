import { io } from 'socket.io-client';

// Global State
let peer;
const myVideo = document.getElementById('my-video');
const strangerVideo = document.getElementById('video');
const button = document.getElementById('send');
const online = document.getElementById('online');
const nextButton = document.getElementById('next-btn'); // Button to skip chat

let remoteSocket;
let type;
let roomid;


// starts media capture
function start() {
  navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then(stream => {
      if (peer) {
        myVideo.srcObject = stream;
        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peer.ontrack = e => {
          strangerVideo.srcObject = e.streams[0];
          strangerVideo.play();
        }
      }
    })
    .catch(ex => {
      console.log(ex);
    });
}

// connect ot server
const socket = io('http://localhost:8000');

// disconnecting event
socket.on('disconnected', () => {
  // Prevent page redirect, handle disconnection here instead
  document.querySelector('.modal').style.display = 'block';
  document.querySelector('.modal').innerText = 'Waiting for another user...';
});

// --------- WebRTC related ---------

// Start 
socket.emit('start', (person) => {
  type = person;
});

// Get remote socket
socket.on('remote-socket', (id) => {
  remoteSocket = id;
  document.querySelector('.modal').style.display = 'none';  // hide the waiting message

  peer = new RTCPeerConnection({
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Public STUN server
    ]
});

  peer.onicecandidate = e => {
    socket.emit('ice:send', { candidate: e.candidate, to: remoteSocket });
  };

  start();
});

// creates offer if 'type' = p1
async function webrtc() {
  if (type == 'p1') {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('sdp:send', { sdp: peer.localDescription });
  }
}

// recive sdp sent by remote socket
socket.on('sdp:reply', async ({ sdp, from }) => {
  await peer.setRemoteDescription(new RTCSessionDescription(sdp));

  if (type == 'p2') {
    const ans = await peer.createAnswer();
    await peer.setLocalDescription(ans);
    socket.emit('sdp:send', { sdp: peer.localDescription });
  }
});

// recive ice-candidate from remote socket
socket.on('ice:reply', async ({ candidate, from }) => {
  await peer.addIceCandidate(candidate);
});


// ----------- Handel Messages Logic -----------

// get room id
socket.on('roomid', id => {
  roomid = id;
});

// handel send button click
button.onclick = e => {
  let input = document.querySelector('input').value;
  socket.emit('send-message', input, type, roomid);

  let msghtml = `<div class="msg" style="color: white;"><b>You: </b> <span id='msg'>${input}</span></div>`;
  document.querySelector('.chat-holder .wrapper').innerHTML += msghtml;

  document.querySelector('input').value = '';
};

// on get message
socket.on('get-message', (input, type) => {
  let msghtml = `<div class="msg"><b>Stranger: </b> <span id='msg'>${input}</span></div>`;
  document.querySelector('.chat-holder .wrapper').innerHTML += msghtml;
});


// Button "next" to skip the current chat
nextButton.addEventListener('click', () => {
  socket.emit('next'); // Ask the server to find a new match

  document.querySelector('.chat-holder .wrapper').innerHTML = '';  // Clear chat
  document.querySelector('.modal').style.display = 'block';  // Show waiting message
  document.querySelector('.modal').innerText = 'Looking for another user...';
});

// Handle when stranger leaves
socket.on('stranger-left', () => {
  let msgHtml = `<div class="msg" style="color: red;"><b>Stranger has left the chat.</b></div>`;
  document.querySelector('.chat-holder .wrapper').innerHTML += msgHtml;

  document.querySelector('.modal').style.display = 'block';
  document.querySelector('.modal').innerText = 'Looking for another user...';
});
