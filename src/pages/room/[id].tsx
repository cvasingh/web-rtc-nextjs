import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import useSocket from '../../hooks/useSocket';

const Room = () => {
    useSocket();

    const router = useRouter();
    const userVideoRef = useRef<HTMLVideoElement | any>(null);
    const peerVideoRef = useRef<HTMLVideoElement | any>(null);
    const rtcConnectionRef = useRef<RTCPeerConnection | any>(null);
    const socketRef = useRef<Socket | any>(null);
    const userStreamRef = useRef<MediaStream | any>(null);
    const hostRef = useRef<boolean | any>(false);

    const { id: roomName } = router.query;
    useEffect(() => {
        socketRef.current = io();
        // First we join a room
        socketRef.current.emit('join', roomName);

        socketRef.current.on('created', handleRoomCreated);

        socketRef.current.on('joined', handleRoomJoined);
        // If the room didn't exist, the server would emit the room was 'created'

        // Whenever the next person joins, the server emits 'ready'
        socketRef.current.on('ready', initiateCall);

        // Emitted when a peer leaves the room
        socketRef.current.on('leave', onPeerLeave);

        // If the room is full, we show an alert
        socketRef.current.on('full', () => {
            window.location.href = '/';
        });

        // Events that are webRTC speccific
        socketRef.current.on('offer', handleReceivedOffer);
        socketRef.current.on('answer', handleAnswer);
        socketRef.current.on('ice-candidate', handlerNewIceCandidateMsg);

        // clear up after
        return () => socketRef.current.disconnect();
    }, [roomName]);
    const handleRoomCreated = () => {
        hostRef.current = true;
        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: { width: 500, height: 500 },
            })
            .then((stream) => {
                /* use the stream */
                userStreamRef.current = stream;
                userVideoRef.current.srcObject = stream;
                userVideoRef.current.onloadedmetadata = () => {
                    userVideoRef.current.play();
                };
            })
            .catch((err) => {
                /* handle the error */
                console.log(err);
            });
    };

    const handleRoomJoined = () => {
        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: { width: 500, height: 500 },
            })
            .then((stream) => {
                /* use the stream */
                userStreamRef.current = stream;
                userVideoRef.current.srcObject = stream;
                userVideoRef.current.onloadedmetadata = () => {
                    userVideoRef.current.play();
                };
                socketRef.current.emit('ready', roomName);
            })
            .catch((err) => {
                /* handle the error */
                console.log('error', err);
            });
    };
    const initiateCall = () => {
        if (hostRef.current) {
            rtcConnectionRef.current = createPeerConnection();
            rtcConnectionRef.current.addTrack(
                userStreamRef.current.getTracks()[0],
                userStreamRef.current,
            );
            rtcConnectionRef.current.addTrack(
                userStreamRef.current.getTracks()[1],
                userStreamRef.current,
            );
            rtcConnectionRef.current
                .createOffer()
                .then((offer: any) => {
                    rtcConnectionRef.current.setLocalDescription(offer);
                    socketRef.current.emit('offer', offer, roomName);
                })
                .catch((error: any) => {
                    console.log(error);
                });
        }
    };

    const ICE_SERVERS = {
        iceServers: [
            {
                urls: 'stun:openrelay.metered.ca:80',
            }
        ],
    };

    const createPeerConnection = () => {
        // We create a RTC Peer Connection
        const connection = new RTCPeerConnection(ICE_SERVERS);

        // We implement our onicecandidate method for when we received a ICE candidate from the STUN server
        connection.onicecandidate = handleICECandidateEvent;

        // We implement our onTrack method for when we receive tracks
        connection.ontrack = handleTrackEvent;
        return connection;

    };
    const handleReceivedOffer = (offer: any) => {
        if (!hostRef.current) {
            rtcConnectionRef.current = createPeerConnection();
            rtcConnectionRef.current.addTrack(
                userStreamRef.current.getTracks()[0],
                userStreamRef.current,
            );
            rtcConnectionRef.current.addTrack(
                userStreamRef.current.getTracks()[1],
                userStreamRef.current,
            );
            rtcConnectionRef.current.setRemoteDescription(offer);

            rtcConnectionRef.current
                .createAnswer()
                .then((answer: any) => {
                    rtcConnectionRef.current.setLocalDescription(answer);
                    socketRef.current.emit('answer', answer, roomName);
                })
                .catch((error: any) => {
                    console.log(error);
                });
        }
    };
    const handleAnswer = (answer: any) => {
        rtcConnectionRef.current
            .setRemoteDescription(answer)
            .catch((err: any) => console.log(err));
    };
    const handleICECandidateEvent = (event: any) => {
        if (event.candidate) {
            socketRef.current.emit('ice-candidate', event.candidate, roomName);
        }
    };
    const handlerNewIceCandidateMsg = (incoming: any) => {
        // We cast the incoming candidate to RTCIceCandidate
        const candidate = new RTCIceCandidate(incoming);
        rtcConnectionRef.current
            .addIceCandidate(candidate)
            .catch((e: any) => console.log(e));
    };
    const handleTrackEvent = (event: any) => {
        peerVideoRef.current.srcObject = event.streams[0];
    };
    const onPeerLeave = () => {
        // This person is now the creator because they are the only person in the room.
        hostRef.current = true;
        if (peerVideoRef.current.srcObject) {
            peerVideoRef.current.srcObject
                .getTracks()
                .forEach((track: any) => track.stop()); // Stops receiving all track of Peer.
        }

        // Safely closes the existing connection established with the peer who left.
        if (rtcConnectionRef.current) {
            rtcConnectionRef.current.ontrack = null;
            rtcConnectionRef.current.onicecandidate = null;
            rtcConnectionRef.current.close();
            rtcConnectionRef.current = null;
        }
    }
    return (
        <div className="flex justify-center gap-10 h-screen bg-[#72fb9e] p-20">
            <video
                className="w-full rounded-lg shadow-lg"
                autoPlay
                ref={userVideoRef}
            />
            <video
                className="w-full rounded-lg shadow-lg"
                autoPlay
                ref={peerVideoRef}
            />
        </div>

    );
};

export default Room;
