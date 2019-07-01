const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const cors = require('cors');
//const cv = require('opencv4nodejs');
const { generateMessage, generateLocationMessage } = require('./src/utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./src/utils/users');


// const FPS = 10;
// const wCap = new cv.VideoCapture(0);
// wCap.set(cv.CAP_PROP_FRAME_WIDTH, 400);
// wCap.set(cv.CAP_PROP_FRAME_HEIGHT, 300);

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

io.on('connection', (socket) => {
    // socket.emit('message', generateMessage('You are welcome to the chat forum!'));
    // socket.broadcast.emit('message', generateMessage('A user has joined.'));
    console.log("New WebSocket connection.");

    socket.on('join', ({ username, room }, callback) => {
        
        const {error, user} = addUser({id: socket.id, username: username, room: room})
        if(error) {
            return callback(error);
        }

        socket.join(user.room);

        // socket.emit('message', generateMessage('You are welcome to the chat forum!'));
        // socket.broadcast.emit('message', generateMessage('A user has joined.'));

        socket.emit('message', generateMessage('Admin', 'You are welcome to the chat forum!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined.`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();       
        
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        if(user) {
            //io.emit('message', generateMessage(message));
            io.to(user.room).emit('message', generateMessage(user.username, message));
        }

        callback("Message delivered!");
        
    });

    socket.on('sendLocation', (position, callback) => {
        const user = getUser(socket.id)

        if(user) {
            //io.emit('locationMessage', generateLocationMessage(`https://google.com/maps/place/?q= ${position.lat}, ${position.long}`));
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps/place/?q= ${position.lat}, ${position.long}`));
        }
        callback('Location delivered!');        
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`));

            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)

            })
        }        
    });

    
    

    


    







    // setInterval(() => {
    //     const frame = wCap.read();
    //     const image = cv.imencode('.jpg', frame).toString('base64');
    //     io.emit('image', image);
    // }, 300);

    
    
});

