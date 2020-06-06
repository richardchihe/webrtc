import React, { Component } from 'react';
import { 
	BrowserRouter as Router, 
	Route, 
	Switch 
} from 'react-router-dom'; 
import Room from './components/Room';
import Lobby from './components/Lobby';
import './App.scss';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      name: null,
    }

    // remove localStorage capabilities for now
    // const raw = localStorage.getItem('chat-name');
    // this.state.name = JSON.parse(raw);
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
    return ( 
      <Router> 
        <div className="App"> 
          <Switch>
            <Route exact path='/' 
              render = {
                () => <Lobby name={this.state.name} 
                        saveName={(name) => {
                          this.setState({name})
                        }}
                      /> 
              } 
            />
            <Route exact path='/:slug' 
              render = {
                () => <Room name={this.state.name} 
                        saveName={(name) => {
                          this.setState({name})
                        }}
                      /> 
              } 
            />
          </Switch> 
        </div> 
      </Router> 
    ); 
  }
}

export default App;
