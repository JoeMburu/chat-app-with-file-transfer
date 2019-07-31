const socket = io.connect('/');

const displayUsers = document.querySelector('#display');
const remoteUserId = document.querySelector('#remoteUserId');
const callBtn = document.querySelector('#callBtn');
const hangUpBtn = document.querySelector('#hangUpBtn');
const videoLocal = document.querySelector('.local');
const videoRemote = document.querySelector('.remote');
const myID = document.querySelector('.myID');

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

let pc = new RTCPeerConnection(configuration, mediaConstraints); 
let remoteId;
let initiatorId;
let localStream;
let remoteStream;


socket.on('connect', () => {
    console.log("connected to server");
    myID.innerHTML = socket.id;
    startCamera();
});


socket.on('update display add', (value) => {
    displayUsers.innerHTML = '';
    for(let i = 0; i < value.length; i++) {  
        let el = document.createElement('div');
        el.setAttribute('id', value[i]);
        el.innerHTML = value[i];
        if(socket.id !== value[i]) {
            el.addEventListener('click', () => {
                start(value[i]);
            });
        }        
        displayUsers.appendChild(el);        
    }  
});

socket.on('update display leave', (id) => {
    let el = document.getElementById(id);
    displayUsers.removeChild(el);
});

hangUpBtn.addEventListener('click', hangUp);

// offer made
socket.on('offer-made', (data) => {
    console.log("received offer");
    pc.setRemoteDescription(data.offer);
 
    pc.createAnswer()
        .then((answer) => {
            pc.setLocalDescription(answer)
                .then(() => {
                    console.log('MAKE ANSWER');
                    //console.log("answer: ", answer);
                    socket.emit('make-answer', {
                        answer: answer,
                        to: data.socket
                    })
                })
                .catch((err) => {
                    console.log("Error: ", err);
                });
        })
        .catch((err) => {
            console.log("Error: ", err);
        });
});

// answer made
socket.on('answer-made', (data) => {
    pc.setRemoteDescription(data.answer);
    console.log("answer made");    
    
 });

 // receive local ice candidate
socket.on('receive-ice-candidate', (data) => {
    console.log("ice candidate received from the first peer...");
    pc.addIceCandidate(data.candidate);
    pc.onicecandidate = (event) => { 
        console.log("event.candidate, remote: ", event.candidate)
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
    console.log("Received remote ice candidates, final: ", data.candidate);
    pc.addIceCandidate(data.candidate);    
 });

 pc.ontrack = event => {
    console.log("on track")
    const stream = event.streams[0];
    remoteStream = stream;
    if(!videoRemote.srcObject || videoRemote.srcObject.id !== stream.id) {
        videoRemote.srcObject = stream;        
    }
}


function startCamera() {
    // get media stream
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
        // get local stream, show it in the local video tag 
        //and add to be sent
        videoLocal.srcObject = stream;
        localStream = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
    })
    .catch((err) => {
        alert("Sorry, your browser does not support Webrtc.");
    });  
    
}

function start(id) {
    remoteId = id;
    initiatorId = socket.id; 
    
    pc.onicecandidate = event => {
        if(event.candidate) {
            console.log("sending ice candidate to the other peer...");
            socket.emit('send-ice-candidate', {
                to: remoteId,
                from: initiatorId,
                candidate: event.candidate
            });           
        }
    }
    
    if(remoteId) {
        console.log("remoteId id true")
        pc.createOffer()
            .then((offer) => {                
                pc.setLocalDescription(new RTCSessionDescription(offer))
                    .then(() => {
                        //console.log('offer: ', offer);
                        console.log("make offer");
                        socket.emit('make-offer', {
                            offer: offer,
                            to: remoteId,
                            from: initiatorId
                        });        
                    })
                    .catch((err) => {
                        console.log("Error:", err);
                    });        
            })
            .catch((err) => {
                console.log('err: ', err)
            });
    }

    

    // navigator.mediaDevices.getUserMedia(constraints)
    // .then((stream) => {
    //     videoLocal.srcObject = stream;
    //     stream.getTracks().forEach(track => pc.addTrack(track, stream));
    // })
    // .catch((err) => {
    //     alert("Sorry, your browser does not support Webrtc.");
    // });  
    
    
    
}

function hangUp() {
    //localStream.getTracks().forEach(track => track.stop());
    //remoteStream.getTracks().forEach(track => track.stop());
}





