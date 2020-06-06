// https://www.freecodecamp.org/news/building-a-modern-chat-application-with-react-js-558896622194/
// Richard Cachero: Modified to use user.uid and user.name and implemented a minimize Chat
import React, { useState, useEffect, useRef } from 'react';
import DragDrop from './dragDrop';

const Chat = props => {
  const [message, setMessage] = useState('')
  const [user, setUser] = useState({ uid: 0, name: '', })
  const [imageZoom, setImageZoom] = useState(false)
  const [hide, setHide] = useState(true)
  const [selectedImage, setSelectedImage] = useState('')

  const scrollToBottom = () => {
    if (!hide) {
      const chat = document.getElementById("chatList");
      chat.scrollTop = chat.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
    setUser({ uid: props.user.uid, name: props.user.name })
  }, [props.user])

  useEffect(() => {
    scrollToBottom()
  }, [props.messages])

  const sendMessage = (msg) => {
    props.sendMessage(msg);
    scrollToBottom()
  }

  const handleSubmit = event => {
    if (message === '') return
    event.preventDefault();
    sendMessage({type:'text', message: { id: user.uid, sender: { uid: user.uid, name: user.name, }, data: { text: message } }})
    setMessage('')
  };

  const handleChange = event => {
    setMessage(event.target.value)
  }

  const renderMessage = (userType, data) => {
    const message = data.message

    const msgDiv = data.type === 'text' && (
      <div className="msg">
        <p>{message.sender.name}</p>
        <div className="message"> {message.data.text}</div>
      </div>
    ) || (
      <div className="msg">
        <p>{message.sender.name}</p>
        <img
          onClick={() => {
            setImageZoom(true)
            setSelectedImage(message.data)
          }}
          className="message"
          style={{
            width: 200,
            // height: 100
            cursor: 'pointer',
          }}
          src={message.data} />
      </div>
    )

    return (<li className={userType} >{ msgDiv }</li>)

  }

  const showEnlargedImage = (data) => {
    return (<img
      src={data}
      style={{
        backgroundColor: 'black',
        position: 'relative',
        zIndex: 100,
        display: 'block',
        cursor: 'pointer',
        marginLeft: 'auto',
        marginRight: 'auto',
        padding: 20,
        borderRadius: 20,
      }}
      onClick={() => setImageZoom(false)}
    />)
  }

  return (
    <div>
      {imageZoom && showEnlargedImage(selectedImage)}

      <div className="chatWindow" style={{
        zIndex: 10,
        position: 'absolute',
        right: 5,
        top: hide && 'unset' || 210,
        bottom: 140,
        maxWidth: 300,
        minWidth: 200,
        width: '-webkit-fill-available',
        backgroundColor: 'rgb(37, 43, 43)'
      }}>
        <div onClick={() => {setHide(!hide)}}  style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}> 
          Chat Box
          <i
            style={{ cursor: 'pointer', padding: 5, 
                    fontSize: 30, color: hide && 'lightgreen' || 'red'
                  }} class='material-icons'
          >
            {hide && 'expand_less' || 'expand_more'}
          </i>
        </div>
        {!hide && (
          <>
            <ul className="chat" id="chatList">
              {props.messages.map(data => (
                <div key={data.id}>
                  {user.uid === data.message.sender.uid ? renderMessage('self', data) : (renderMessage('other', data))}
                </div>
              ))}
            </ul>
            <DragDrop
              className="chatInputWrapper"
              sendFiles={(files) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                  //https://blog.mozilla.org/webrtc/large-data-channel-messages/
                  //https://lgrahl.de/articles/demystifying-webrtc-dc-size-limit.html
                  const maximumMessageSize = 262118 //65535 <=== 64KiB // 16384 <=== 16KiB to be safe
                  if (e.target.result.length <= maximumMessageSize)
                    sendMessage({ type: 'image', message: { id: user.uid, sender: { uid: user.uid, }, data: e.target.result } })
                  else
                    alert('Message exceeds Maximum Message Size!')
                }
                reader.readAsDataURL(files[0])
              }}
            >
              <div>
                <form onSubmit={handleSubmit}>
                  <input
                    className="textarea input"
                    type="text"
                    placeholder="Enter your message..."
                    onChange={handleChange}
                    value={message}
                  />
                </form>
              </div>
            </DragDrop>
          </>
        )}
      </div>
    </div>
  )
}

export default Chat