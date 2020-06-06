import React, { Component } from 'react';
import Video from './Video';

class Videos extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rVideos: [],
      remoteStreams: []
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.remoteStreams !== nextProps.remoteStreams) {
      let _rVideos = nextProps.remoteStreams.map((rVideo, index) => {
        const _videoTrack = rVideo.stream.getTracks().filter(track => track.kind === 'video');
        
        let video = _videoTrack && (
          <Video 
            videoStream={rVideo.stream}
            frameStyles={{ 
              width: 120, height: 120, 
              float: 'left', padding: '0 3px' 
            }}
            videoStyles={{
              cursor: 'pointer', objectFit: 'cover',
              borderRadius: 3, width: '100%', height: '100%'
            }}
            autoplay
          />
        ) || <div></div>;
          
          
        return (
          <div
            id={rVideo.name}
            onClick={() => this.props.switchVideo(rVideo)}
            style={{display: 'inline-block'}}
            key={index}
          >
            {video}
          </div>
        )
      });

      this.setState({
        remoteStreams: nextProps.remoteStreams,
        rVideos: _rVideos
      });
    }
  }

  render() {
    return (
      <div className="videos-container">
        { this.state.rVideos }
      </div>
    )
  }
}

export default Videos