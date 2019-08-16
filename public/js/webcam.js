const socket = io.connect('/');

const displayUsers = document.querySelector('#display');
const remoteUserId = document.querySelector('#remoteUserId');
const callBtn = document.querySelector('#callBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
const videoLocal = document.querySelector('.local');
const videoRemote = document.querySelector('.remote');
const myID = document.querySelector('.myID');
const sendMessageBtn = document.querySelector('#sendMessageBtn');
const messageBox = document.querySelector('#messageBox');
const messageArea = document.querySelector('.messageArea');
const typingIndicator = document.querySelector('.typing-indicator');
const file_to_send = document.querySelector('#file_to_send');
const fileProgress = document.querySelector('#fileProgress');
const receivedFileLink = document.querySelector('#receivedFileLink');


// Options
const { username } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const configuration =
        {"iceServers": [
            {"urls": "stun:stun.l.google.com:19302"},
            {
                "urls": 'turn:numb.viagenie.ca',
                "credential": 'muazkh',
                "username": 'webrtc@live.com'
            } 
        ]};
const constraints = {audio: true, video: true};
const mediaConstraints = {
    'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
    },
    'optional': [{'DtlsSrtpKeyAgreement': 'true'}]
};
const dataChannelOptions = {
    ordered: false, //no guaranteed delivery, unreliable but faster 
    maxPacketLifeRetransmitTime: 1000, //milliseconds
    
};

let pc; 
let remoteId;
let initiatorId;
let localStream;
let remoteStream;
let typer;
let fileBuffer = [];
let fileSize = 0;
let receivedFileSize;
let receivedFileName;


socket.on('connect', () => {
    console.log("connected to server");
    myID.innerHTML = socket.id + ' - ' + username;
    typer = username;
    socket.emit('send client name', username, socket.id);    
});

function updateUi(users) {
    displayUsers.innerHTML = '';
    for(let i = 0; i < users.length; i++) {  
        let el = document.createElement('div');
        el.setAttribute('id', users[i].id);
        el.innerHTML = users[i].id + ' - ' + users[i].name;
        if(socket.id !== users[i].id) {
            el.addEventListener('click', () => {
                startCall(users[i].id);                
            });
        }        
        displayUsers.appendChild(el);        
    }  
};

socket.on('update display add', (users) => {
    updateUi(users);
});

socket.on('update display leave', (users) => {
    updateUi(users);    
});

// offer made
socket.on('offer-made', (data) => {
    console.log("received offer");
    // call the accept_send_answer
    accept_send_answer(data.offer, data.socket);
});

// answer made
socket.on('answer-made', (data) => {
    peerConn.setRemoteDescription(data.answer);
    console.log("answer received");     
});

// receive local ice candidate
socket.on('receive-ice-candidate', (data) => {
    console.log("ice candidate received from the first peer...");
    peerConn.addIceCandidate(data.candidate);
    peerConn.onicecandidate = (event) => { 
        console.log("sending local ice candidate to the remote");
        if(event.candidate) {                    
            socket.emit('send-remote-ice-candidate', {
                candidate: event.candidate,
                to: data.to
            });
        }
    }
});

// send remote ice candidate
socket.on('receive-remote-ice-candidate', (data) => {
//console.log("Received remote ice candidates from the other peer, final: ", data.candidate);
peerConn.addIceCandidate(data.candidate);    
});

// user typing
socket.on('user-typing', (typer) => {
//typingIndicator.innerHTML = '<h3>' + typer.typer + ' is typing' + '</h3>';
});

// user-not-typing
socket.on('user-not-typing', () => {
    //typingIndicator.innerHTML = '';  
});

// receiving sent file
socket.on('receive-sent-file', (data) => {
    console.log("Receiving sent file, " + data.filename +
      "and size " + data.filesize + " bytes.");
    fileProgress.value = 1;
    fileSize = 0;
    receivedFileSize = data.filesize;
    receivedFileName = data.filename;
});


const peerConn = new RTCPeerConnection(configuration, mediaConstraints);

const handleDataChannelOpen = function (event) {
    console.log("Data channel onOpen", event);
    sendChannel.send("Welcome to text chat app!");
};

const handleDataChannelError = function (error) {
    console.log("Data Channel onError: ", error);
};

const handleDataChannelMessageReceived = function (event) {
    
    if(typeof event.data === 'string') {
        // print to messageArea
        let el = document.createElement('div');
        el.setAttribute('id', 'message');
        el.innerHTML = event.data;
        messageArea.appendChild(el); 
        
    } else if(typeof event.data === 'object') {
        // We process the incoming files
        fileBuffer.push(event.data);
        //console.log("Getting the file bytes");
        fileSize = fileSize + event.data.byteLength;
        console.log("filesize: ", fileSize);
        fileProgress.value = fileSize;

        // Provide link to downloadable file when complete
        if(fileSize === receivedFileSize) {
            const received = new window.Blob(fileBuffer);
            fileBuffer = [];

            receivedFileLink.href = URL.createObjectURL(received);
            receivedFileLink.download = receivedFileName;
            receivedFileLink.appendChild(document.createTextNode(receivedFileName + "(" + fileSize + ") bytes"));
        }
    }
    
    
       
    
    
};

const handleDataChannelClose = function (event) {
    console.log("Data Channel onClose", event);    
};

let sendChannel = peerConn.createDataChannel("send-messages", dataChannelOptions);  
sendChannel.onopen = handleDataChannelOpen;
sendChannel.onmessage = handleDataChannelMessageReceived;
sendChannel.onerror = handleDataChannelError;
sendChannel.onclose = handleDataChannelClose;

file_to_send.addEventListener('change', function(event) {
    console.log("Sending file, " + 
        file_to_send.files[0].name + " " + 
        file_to_send.files[0].size + " bytes.");
    console.log("send to: ", remoteId);
    console.log("sender: ", initiatorId);    
    socket.emit('send-file', {
        to: remoteId,
        sender: initiatorId,
        filename: file_to_send.files[0].name,
        filesize: file_to_send.files[0].size
    });

    fileProgress.max = file_to_send.files[0].size;
    const chunkSize = 16384;

    const sliceFile = function(offset) {
        const reader = new window.FileReader();
        reader.onload = (function() {
            return function(e) {
                sendChannel.send(e.target.result);
                if(file_to_send.files[0].size > offset + 
                    e.target.result.byteLength) {
                        window.setTimeout(sliceFile, 0, offset + chunkSize);
                    }
                fileProgress.value = offset + e.target.result.byteLength;    
            };
        })(file_to_send.files[0]);
        let slice = file_to_send.files[0].slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
    }
    sliceFile(0);  
}, false);



peerConn.ondatachannel = function(event) {
   
    let receiveChannel = event.channel;
    receiveChannel.onopen = handleDataChannelOpen;
    receiveChannel.onmessage = handleDataChannelMessageReceived;
    receiveChannel.onerror = handleDataChannelError;
    receiveChannel.onclose = handleDataChannelClose;

    sendMessageBtn.addEventListener('click', function() {
        let message = messageBox.value;

        // print this on our messageArea
        let el = document.createElement('div');
        el.setAttribute('id', 'message');
        el.innerHTML = message;
        messageArea.appendChild(el);    

        // then send it to the other peer and clear the input
        receiveChannel.send(message);
        messageBox.value = "";
    });


}

peerConn.ontrack = function(event) {
    const stream = event.streams[0];
    remoteStream = stream;
    if(!videoRemote.srcObject || videoRemote.srcObject.id !== stream.id) {
        videoRemote.srcObject = stream;        
    }
}



function initiate_call() {
  navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        videoLocal.srcObject = stream;
        for(const track of stream.getTracks()) {
            peerConn.addTrack(track, stream);
        }
        return peerConn.createOffer();
    })
    .then(function(offer) {
        //signaling and invite
        console.log("make offer");
        socket.emit('make-offer', {
            offer: offer,
            to: remoteId,
            from: initiatorId
        });        
        return peerConn.setLocalDescription(offer);
    })
    .catch(function(error) {
        console.log("Error in offer", error);
    });

    peerConn.onicecandidate = event => {
        if(event.candidate) {
            console.log("sending ice candidate to the other peer...");
            socket.emit('send-ice-candidate', {
                to: remoteId,
                from: initiatorId,
                candidate: event.candidate
            });           
        }
    }

}

function accept_send_answer(offer, caller_id) {
    peerConn.setRemoteDescription(offer)
      .then(function() {
          return navigator.mediaDevices.getUserMedia(constraints);
      })
      .then(function(stream) {
          videoLocal.srcObject = stream;
          for(const track of stream.getTracks()) {
              peerConn.addTrack(track, stream);
          }
          return peerConn.createAnswer();
      })
      .then(function(answer) {
        //signalingto caller and send answer
        console.log('MAKE ANSWER');
        //console.log("answer: ", answer);
        socket.emit('make-answer', {
            answer: answer,
            to: caller_id
        })

        return peerConn.setLocalDescription(answer);
      })
      .catch(function(error) {
          console.log("Error in answer: ", error);
      });
}


function startCall(id) {
        remoteId = id;
        initiatorId = socket.id; 
        if(initiatorId) {
            initiate_call();
        } 

}


// function hangUp() {
//     console.log("hang up");
//     pc = null;
//     dataChannel = null;
//     findState();
   
// }


//hangUpBtn.addEventListener('click', hangUp);

function call() {
    console.log("calling...");
    console.log(dataChannel);   
    
}

callBtn.addEventListener('click', call);


// messageBox.addEventListener('keydown', function(event) {
//   socket.emit('typing', {
//       typer: typer      
//   })
// });

// messageBox.addEventListener('keyup', function(event) {
//    socket.emit('not-typing', function() {

//    })
// })


// sending text
// sendMessageBtn.addEventListener('click', function() {
//     let message = messageBox.value;
//     sendChannel.send(message);
//     messageBox.value = "";
// });
// end of sending text