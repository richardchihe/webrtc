import React, { Component } from 'react';
import io from 'socket.io-client';
import Video from './Video';
import Videos from './Videos';
import Chat from './Chat';

class Room extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isAskingName: false,
      name: null,
      localStream: null, // own stream
      remoteStreams: [], // all remote streams
      peerConnections: {}, // socket io connetions
      selectedVideo: null, // selected remote stream
      status: 'Please wait...',
      pc_config: { // config for WebRTC NAT and STUN servers
        "iceServers": [
          {
            urls: process.env.REACT_APP_STUN_URL
          },
          {
            urls: process.env.REACT_APP_TURN_URL,
            'username': process.env.REACT_APP_TURN_URL_USERNAME,
            'credential': process.env.REACT_APP_TURN_URL_CREDENTIAL
          }
        ]
      },
      sdpConstraints: {
        'mandatory': {
          'OfferToReceiveAudio': true,
          'OfferToReceiveVideo': true
        }
      },
      hasMedia: true,
      messages: [], // chat messages
      sendChannels: [], // chat channels (one for each peer)
    }

    this.state.name = this.props.name;

    if (!this.state.name) {
      this.state.isAskingName = true;
    }

    this.serviceIP = process.env.REACT_APP_SERVICE_URL + '/roomPeer';
    this.socket = null;
  }

  componentDidMount = () => {
    if (this.state.name) {
      this.initializeSocket();
    }
  }

  getLocalStream = () => {
    const success = (stream) => {
      window.localStream = stream;   
      this.setState({localStream: stream, hasMedia: true});
      // 2. get online users
      this.whoIsOnline();
    }

    const failure = (e) => {
      this.setState({hasMedia: false});
      console.log('getUserMedia Error: ', e);
    }

    const constraints = {audio: true, video: true};

    // 1. get permission to use camera and mic
    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure);
  }

  whoIsOnline = () => {
    // ask socket io server for online users
    this.sendToPeer('onlinePeers', null, {local: this.socket.id});
  }

  sendToPeer = (messageType, payload, socketID) => {
    this.socket.emit(messageType, {
      socketID,
      payload
    });
  }

  createPeerConnection = (socketID, callback) => {
    try {
      // create WebRTC connection
      let pc = new RTCPeerConnection(this.state.pc_config);

      const peerConnections = {...this.state.peerConnections, [socketID]: pc};
      this.setState({
        peerConnections
      });

      // each peer connection will have these listeners
      // onicecandidate, onconnectionstatechange, ontrack, 

      // upon receiving an icecandidate from STUN or TURN servers
      //  (this acts like a map so that other peers will
      //   be able to connect with this peer through Web RTC)
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.sendToPeer('candidate', e.candidate, {
            local: this.socket.id,
            remote: socketID
          }); 
        }
      };

      pc.onconnectionstatechange = (e) => {
        
      }

      // Two streams are received for each peer if audio and video are requested.
      pc.ontrack = ({streams: [stream]}) => {
        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: stream
        }

        // Check if socketID already exists in the remote streams and prevent from creating a new one.
        if (this.state.remoteStreams.find(remote => remote.id === socketID)) {
          return;
        }

        this.setState(prevState => {
          const remoteStream = prevState.remoteStreams.length > 0 ? {} : { remoteStream: stream };

          let selectedVideo = prevState.remoteStreams.filter(x => x.id === prevState.selectedVideo.id);
          selectedVideo = selectedVideo.length ? {} : {selectedVideo: remoteVideo};

          return {
            ...selectedVideo,
            ...remoteStream,
            remoteStreams: [...prevState.remoteStreams, remoteVideo]
          };
        });
      }

      pc.close = (e) => {
        
      }

      if (this.state.localStream) {
        for (const track of this.state.localStream.getTracks()) {
          pc.addTrack(track, this.state.localStream);
        }
      }

      callback(pc);

    } catch(e) {
      console.log('Something went wrong! pc not created!!', e);
      callback(null);
    }
  }

  initializeSocket = () => {
    // 2. create connection to socket
    this.socket = io(
      this.serviceIP,
      {
        path: '/io/webrtc',
        query: {
          room: window.location.pathname,
        }
      }
    );

    // if connection is successful
    this.socket.on('connection-success', data => {
      this.getLocalStream();

      const status = data.peerCount > 1 ? 
        `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` :
        'Waiting for others to connect';

      this.setState({
        status: status
      });
    });

    // if a peer conencts
    this.socket.on('joined-peers', data => {
      const status = data.peerCount > 1 ? 
        `Total Connected Peers: ${data.peerCount}` :
        'Waiting for others to connect';

      this.setState({
        status: status
      });
    });

    // if a peer disconnects
    this.socket.on('peer-disconnected', data => {
      const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== data.socketID);
      const status = data.peerCount > 1 ?
        `Total Connected Peers: ${data.peerCount}` :
        'Waiting for others to connect';

      this.setState(prevState => {
        // check if disconnected peer is the selected video 
        // and if there still connected peers, then select the first
        const selectedVideo = null;

        return {
          status,
          remoteStreams,
          ...selectedVideo,
        };
      });
    });

    // upon receiving other online users
    this.socket.on('online-peer', socketID => {
      // create a peer connection (start of WebRTC) 
      // first create offer
      this.createPeerConnection(socketID, pc => {
        if (pc) {
          const handleSendChannelStatusChange = (event) => {
            //joined or exit
          }

          // for each peer create a sendChannel that for chatting and file transfer
          const sendChannel = pc.createDataChannel('sendChannel')
          sendChannel.onopen = handleSendChannelStatusChange;
          sendChannel.onclose = handleSendChannelStatusChange;

          this.setState(prevState => {
            return {
              sendChannels: [...prevState.sendChannels, sendChannel]
            }
          });

          // when chat messages are received
          const handleReceiveMessage = (event) => {
            const message = JSON.parse(event.data);
            this.setState(prevState => {
              return {
                messages: [...prevState.messages, message]
              }
            });
          }

          const handleReceiveChannelStatusChange = (event) => {
            if (this.receiveChannel) {
              console.log("receive channel's status has changed to " + this.receiveChannel.readyState)
            }
          }

          const receiveChannelCallback = (event) => {
            const receiveChannel = event.channel;
            receiveChannel.onmessage = handleReceiveMessage;
            receiveChannel.onopen = handleReceiveChannelStatusChange;
            receiveChannel.onclose = handleReceiveChannelStatusChange;
          }

          pc.ondatachannel = receiveChannelCallback;

          // first step on creating WebRTC peer createOffer
          pc.createOffer(this.state.sdpConstraints)
            .then(sdp => {
              pc.setLocalDescription(sdp);
              this.sendToPeer('offer', sdp, {
                local: this.socket.id,
                remote: socketID
              });
            });
        } 
      });
    });

    // listen for WebRTC icecandidates
    this.socket.on('candidate', (data) => {
      // get remote's peerConnection
      const pc = this.state.peerConnections[data.socketID];

      if (pc) {
        // will allow proper WebRTC routing to pc
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // listen for WebRTC offers
    this.socket.on('offer', data => {
      this.createPeerConnection(data.socketID, pc => {
        pc.addStream(this.state.localStream);

        const handleSendChannelStatusChange = (event) => {
          console.log('send channel status: ' + this.state.sendChannels[0].readyState);
        }

        // send Channel
        const sendChannel = pc.createDataChannel('sendChannel')
        sendChannel.onopen = handleSendChannelStatusChange
        sendChannel.onclose = handleSendChannelStatusChange
        
        this.setState(prevState => {
          return {
            sendChannels: [...prevState.sendChannels, sendChannel]
          }
        });

        // when chat messages are received
        const handleReceiveMessage = (event) => {
          const message = JSON.parse(event.data);
          this.setState(prevState => {
            return {
              messages: [...prevState.messages, message]
            }
          });
        }

        const handleReceiveChannelStatusChange = (event) => {
          if (this.receiveChannel) {
            console.log("receive channel's status has changed to " + this.receiveChannel.readyState);
          }
        }

        const receiveChannelCallback = (event) => {
          const receiveChannel = event.channel;
          receiveChannel.onmessage = handleReceiveMessage;
          receiveChannel.onopen = handleReceiveChannelStatusChange;
          receiveChannel.onclose = handleReceiveChannelStatusChange;
        }

        pc.ondatachannel = receiveChannelCallback;

        // second step on creating WebRTC peer setRemoteDescription with offer sdp
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
          // third step on creating WebRTC peer createAnswer
          pc.createAnswer(this.state.sdpConstraints)
            .then(sdp => {
              pc.setLocalDescription(sdp);
              this.sendToPeer('answer', sdp, {
                local: this.socket.id,
                remote: data.socketID
              });
            });
        });
      });
    });

    // listen for WebRTC answers
    this.socket.on('answer', data => {
      // get remote's peerConnection
      const pc = this.state.peerConnections[data.socketID]
      // fourth step on creating WebRTC peer setRemoteDescription with asnwer sdp
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(()=>{})
    });
  }

  switchVideo = (_video) => {
    this.setState({
      selectedVideo: _video
    });
  }

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  }

  handleSubmit = async e => {
    e.preventDefault();
    // 1 get name of user
    this.setState({
      isAskingName: false,
    });

    this.initializeSocket();
  }
  
  render() {
    const statusText = <div style={{color: 'yellow', padding: 5}}>{this.state.status}</div>;

    return (
      <>
        <div className="status">
          {statusText}
        </div>
        <Video 
          videoStyles={{
            zIndex: 2, position: 'fixed', right: 0,
            width: 200, height: 200, margin: 5, backgroundColor: 'black'
          }}
          showMuteControls={true}
          videoStream={this.state.localStream}
          autoPlay
          muted
        />
        <Video
          frameStyles={{ 
            width: '100vw', height: '100vh', 
            backgroundColor: 'black', zIndex: 1, 
            textAlign: 'center', position: 'fixed' 
          }}
          videoStyles={{
            zIndex: 1, position: 'relative',
            bottom: 0, display: 'inline-block',
            height: 'inherit', width: 'inherit'
          }}
          videoStream={this.state.selectedVideo && this.state.selectedVideo.stream}
          autoPlay
        />
        <Videos
          switchVideo={this.switchVideo}
          remoteStreams={this.state.remoteStreams}
        />
        <br />
        <Chat 
          user={{
            uid: this.socket && this.socket.id || '',
            name: this.socket && this.state.name || ''
          }}
          messages={this.state.messages}
          sendMessage={(message) => {
            this.setState(prevState => {
              return {messages: [...prevState.messages, message]}
            });
            this.state.sendChannels.map(sendChannel => {
              sendChannel.readyState === 'open' && sendChannel.send(JSON.stringify(message))
            })
          }}
        />
        {this.state.isAskingName &&
          <div class="modal show dialog" id="exampleModal" tabindex="-1" role="dialog">
            <div class="modal-dialog">
              <div class="modal-content">
                <form onSubmit={this.handleSubmit}>
                  <div class="modal-header">
                    <h5 class="modal-title">Who are you?</h5>
                  </div>
                  <div class="modal-body">
                    <input id="name" name="name" value={this.state.name} onChange={this.handleChange}/>
                  </div>
                  <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Next</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        }
        {!this.state.hasMedia &&
          <div class="modal show dialog" id="exampleModal" tabindex="-1" role="dialog">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">No Media Connection</h5>
                </div>
                <div class="modal-body">
                  Connect camera and mic then allow site access.
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-primary" onClick={() => this.getLocalStream() }>Retry!</button>
                </div>
              </div>
            </div>
          </div>
        }
      </>
    );
  }
}

export default Room;