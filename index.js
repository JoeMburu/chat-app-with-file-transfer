const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const cors = require('cors');


app.use(cors());
const server = http.createServer(app);
const publicDirectory = path.join(__dirname, 'public');

app.use(express.static(publicDirectory));
app.get('/', (req, res, next) => {
    res.sendFile('index.html');
});


const port = process.env.PORT || 3000;
const io = require('socket.io')(server);

server.listen(port, () => {
    console.log("Server listening at port: " + port);
});

const users = [];

io.on('connection', (socket) => {
    
    // socket.emit('message', generateMessage('You are welcome to the chat forum!'));
    // socket.broadcast.emit('message', generateMessage('A user has joined.'));
    
    users.push(socket.id);
    
    io.emit('update display add', users);

    socket.on('disconnect', () => {
       users.splice(users.indexOf(socket.id), 1);
       io.emit('update display leave', socket.id);
    });  
    
    socket.on('make-offer', (data) => {
        socket.to(data.to).emit('offer-made', {
            offer: data.offer,
            socket: data.from
        });
    });

    socket.on('make-answer', (data) => {
        socket.to(data.to).emit('answer-made', {            
            answer: data.answer,
            socket: socket.id,
        });
    });

    
    socket.on('send-ice-candidate', (data) => {
        socket.to(data.to).emit('receive-ice-candidate', {
            candidate: data.candidate,
            to: data.from
        });
    });

    socket.on('send-remote-ice-candidate', (data) => {
        console.log("send remote ice candidate: ", data.candidate)
        socket.to(data.to).emit('receive-remote-ice-candidate', {
            candidate: data.candidate            
        });
    });
    
});

