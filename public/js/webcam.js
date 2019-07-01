const socket = io();

const sendButton = document.getElementById('messageSubmitBtn');
const chatArea = document.getElementById('message-box');
const geoLocationBtn = document.getElementById('geoLocationBtn');
const $messages = document.querySelector('#messages');

// Template
const messageTemplate = document.querySelector('#message-template').innerHTML;
const urlTemplate = document.querySelector('#url-template').innerHTML;
const chatSidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const {username, room} = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    console.log("autoscrollling...");

    // New message element
    const $newMessage = $messages.lastElementChild;
    
    // Height of the new messages 
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    // Visible height
    const visibleHeight = $messages.offsetHeight;

    // Height of messages container
    const containerHeight = $messages.scrollHeight;

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if(containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }  
    
}

// Location event
socket.on('locationMessage', (location) => {
   //console.log(url);
    const html = Mustache.render(urlTemplate, {
        username: location.username,
        url: location.url,
        createdAt: moment(location.createdAt).format('h:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

// New message event
socket.on('message', (message) => {      
    const html = Mustache.render(messageTemplate, {
       username: message.username,
       message: message.text,
       createdAt: moment(message.createdAt).format('h:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomData', (roomData) => {
    const html = Mustache.render(chatSidebarTemplate, {
        room: roomData.room,
        users: roomData.users
    });    
    document.querySelector('#chat-sidebar').innerHTML = html;
});

sendButton.addEventListener('click', (event) => {
    event.preventDefault();
    let message = chatArea.value;
    socket.emit('sendMessage', message, (ack) => {
        console.log(ack);
    });
});

geoLocationBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if(!navigator.geolocation) {
        return alert("Your browser does not support Geolocation");
    }

    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', { 
            long: position.coords.longitude, 
            lat: position.coords.latitude 
        }, (ack) => {
            console.log(ack);
        });
        
    });
});

// socket.on('image', (image) =>  {
    
//     const imageTag = document.getElementById('image');
//     imageTag.src =  `data:image/jpeg;base64, ${image}`;
// });


socket.emit('join', { username, room}, (error) => {
    if(error) {
        alert("Error: " + error);
        location.href = '/index.html';
    }
});

