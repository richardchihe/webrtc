import React, { Component } from 'react';
import io from 'socket.io-client';
import { withRouter } from 'react-router-dom';

class Lobby extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isAskingName: false,
      name: null,
      rooms: [],
      isAskingToCreateRoom: false,
      roomName: null,
      status: 'Please wait...'
    };

    this.state.name = this.props.name;

    if (!this.state.name) {
      this.state.isAskingName = true;
    }

    this.serviceIP = process.env.REACT_APP_SERVICE_URL + '/lobbyPeer';
    this.socket = null;
  }

  componentDidMount() {
    this.initializeSocket();
    console.log(this.props);
  }

  componentWillUnmount = () => {
    console.log("Will Unmount Called!");
  }

  initializeSocket = () => {
    // 2. create connection to socket
    this.socket = io(
      this.serviceIP,
      {
        path: '/io/webrtc',
        query: {}
      }
    );

    // if connection is successful
    this.socket.on('connection-success', data => {
      const status = data.peerCount > 1 ? 
        `Total Peers in the Lobby: ${data.peerCount}` :
        'Waiting for others to connect';

      this.setState({
        status,
        rooms: data.rooms
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
      const status = data.peerCount > 1 ?
        `Total Connected Peers: ${data.peerCount}` :
        'Waiting for others to connect';

      this.setState({
        status,
        rooms: data.rooms
      });
    });
  }

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  }

  handleNext = e => {
    // remove localStorage capabilities for now
    // localStorage.setItem('chat-name', JSON.stringify(this.state.name));
  }

  handleSubmit = async e => {
    e.preventDefault();

    this.setState(prevState => {
      if (!this.state.rooms.length) {
        return {
          isAskingName: false,
          isAskingToCreateRoom: true
        }
      }
      return {
        isAskingName: false
      }
    });
  }

  createRoom = async e => {
    e.preventDefault();
    this.props.saveName(this.state.name);
    this.props.history.push(this.state.roomName);
  }

  joinRoom = async room => {
    this.props.saveName(this.state.name);
    this.props.history.push(room);
  }
  
  render() { 
    const statusText = <div style={{color: 'yellow', padding: 5}}>{this.state.status}</div>;

    return ( 
      <> 
        <div className="status">
          {statusText}
        </div>

        <div style={{padding: '1em'}}>
          <button type="button" class="btn btn-success" onClick={() => {this.setState({isAskingToCreateRoom: true})}}>Create Room</button>
        </div>
        {!this.state.rooms.length ?
          <div class="container-md pt-3">
            <h1>No room available</h1> 
          </div> : 
          <div class="container-sm pt-3"  style={{display: 'flex', flexWrap: 'wrap'}}>
            {this.state.rooms.map((room) => (
              <div class="container-lg room">
                {room}
                <button type="button" class="btn btn-primary" onClick={() => {this.joinRoom(room)}} style={{margin: '1em'}}>Join Room</button>
              </div>
            ))}
          </div>
        }
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
                    <button type="submit" class="btn btn-primary" onClick={this.handleNext}>Next</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        }
        {this.state.isAskingToCreateRoom &&
          <div class="modal show dialog" id="exampleModal" tabindex="-1" role="dialog">
            <div class="modal-dialog">
              <div class="modal-content">
                <form onSubmit={this.createRoom}>
                  <div class="modal-header">
                    <h5 class="modal-title">Create a room?</h5>
                  </div>
                  <div class="modal-body">
                    <div class="form-group">
                      <label for="roomName" style={{float: 'left'}}>Room Name </label>
                      <input id="roomName" name="roomName" class="form-control" value={this.state.roomName} onChange={this.handleChange}/>
                    </div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-danger" onClick={() => {this.setState({isAskingToCreateRoom: false})}}>No</button>
                    <button type="submit" class="btn btn-primary">Create</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        }
      </> 
    ); 
  }
}

export default withRouter(Lobby);
