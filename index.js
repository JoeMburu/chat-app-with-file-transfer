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


const port = process.env.PORT || 4000;
const io = require('socket.io')(server);

server.listen(port, () => {
    console.log("Server listening at port: " + port);
});

const users = [];
function User(id, name) {
    this.id = id;
    this.name = name;
}

function addUser(user) {
    users.push(user);       
    io.sockets.emit('update display add', users);  
}

function removeUser(id) {
    let index = users.findIndex(user => {
       return user.id === id;
   })

   if(index !== -1) {
        users.splice(index, 1);    
        io.sockets.emit('update display leave', users);    
    }  
}


io.on('connection', (socket) => {    
    console.log('User - ' + socket.id + ' - connected.');
    
    
    socket.on('send client name', (name, id) => {   
        if(socket.id === id)  {
            let user = new User(id, name);
            addUser(user);                                   
        }             
    });    

    socket.on('disconnect', () => {       
       removeUser(socket.id);                   
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
        //console.log("send remote ice candidate back to the first peer: ", data.candidate)
        socket.to(data.to).emit('receive-remote-ice-candidate', {
            candidate: data.candidate            
        });
    });

    socket.on('typing', (typer) => {
        io.emit('user-typing', {
            typer: typer.typer
        });
    });

    socket.on('not-typing', () => {
        io.emit('user-not-typing');
    });

    socket.on('send-file', (data) => {
        console.log("file received for transfer: ");
        console.log("from: ", data.sender);
        console.log("to: ", data.to);
        console.log("filename: ", data.filename);
        socket.to(data.to).emit('receive-sent-file', {
            filename: data.filename,
            filesize: data.filesize
        });
    });


    
    
});

// socket.emit('message', generateMessage('You are welcome to the chat forum!'));
    // socket.broadcast.emit('message', generateMessage('A user has joined.'));