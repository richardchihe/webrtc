import React, { Component } from 'react';

class Video extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mic: true,
      camera: true
    };
  }

  componentDidMount() {
    if(this.props.videoStream) {
      this.video.srcObject = this.props.videoStream;
    }
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.videoStream && nextProps.videoStream !== this.props.videoStream) {
      this.video.srcObject = nextProps.videoStream;
    }
  }

  muteMic = (e) => {
    const stream = this.video.srcObject.getTracks().filter(track => track.kind === 'audio');
    this.setState(prevState => {
      if (stream) {
        stream[0].enabled = !prevState.mic;
      }
      return {mic: !prevState.mic};
    })
  }

  muteCamera = (e) => {
    const stream = this.video.srcObject.getTracks().filter(track => track.kind === 'video');
    this.setState(prevState => {
      if (stream) {
        stream[0].enabled = !prevState.camera;
      }
      return {camera: !prevState.camera};
    })
  }

  render() {
    const muteControls = this.props.showMuteControls && (
      <div className="mute-controls"> 
        <i onClick={this.muteMic} 
          style={{ cursor: 'pointer', padding: 5, 
                  fontSize: 20, color: this.state.mic && 'lightgreen' || 'red' 
                }} class='material-icons'
        >
          {this.state.mic && 'mic' || 'mic_off'}
        </i>
        <i onClick={this.muteCamera} 
          style={{ cursor: 'pointer', padding: 5, 
                  fontSize: 20, color: this.state.camera && 'lightgreen' || 'red' 
          }} class='material-icons'
        >
          {this.state.camera && 'videocam' || 'videocam_off'}
        </i>
      </div>
    )
    return (
      <div
        style={{...this.props.frameStyles}}
      >
        <video 
          id={this.props.id}
          muted={this.props.muted}
          autoPlay
          style={{...this.props.videoStyles}}
          ref={(ref) => {this.video = ref}}
        >
        </video>
        {muteControls}
      </div>
    )
  }
}

export default Video