import { useCallback, useEffect, useRef, useState } from 'react'

import './App.css'
import Qrcode from './components/Qrcode'
import usePaperslip from './hooks/usePaperslip'

function App() {
  const [isSending, setIsSending] = useState(false)
  const [mode, setMode] = useState(null)
  const [readContent, setReadContent] = useState([])
  const [topic, setTopic] = useState(null)

  const readInputRef = useRef()
  const readStream = useRef()
  const writeInputRef = useRef()
  const writeNet = useRef()

  const { read, write, connections, startWrite } = usePaperslip({
    topic,
  })

  useEffect(() => {
    const query = window.location.search.substring(1)
    const param = query.split('=')
    if (param?.[0]) {
      setMode(param[0] === 'read' ? 'read' : 'write')
      setTopic(param[1])
    }
  }, [])

  useEffect(() => {
    if (topic && mode === 'read') {
      readStream.current = read()
      console.log('INITIALIZE READ', { topic, mode }, readStream.current)
    }
  }, [mode, read, startWrite, topic])

  useEffect(() => {
    if (mode === 'read' && connections.length) {
      connections.map((connection) => {
        connection.socket.on('data', (data) => {
          const string = data.toString()
          console.log('stream onData', data, string, readStream.current)
          setReadContent((previousReadContent) =>
            (previousReadContent || []).concat(string),
          )
        })
        return connection.details
      })
    }
  }, [mode, connections])

  const onSend = useCallback(() => {
    const message = writeInputRef.current.value
    writeNet.current = write(message)
    setIsSending(true)
  }, [write])

  if (!mode) {
    return (
      <div className="App">
        <input
          className="topic"
          onChange={(e) => setTopic(e.target.value)}
          type="text"
          value={topic}
          placeholder="topic"
        />
        <p>
          <a href={`?read=${topic}`}>read</a> or <a href={`?write=${topic}`}>write</a>
        </p>
      </div>
    )
  }

  return (
    <div className="App">
      <div className="topic">{topic}</div>

      {mode === 'read' && !!readContent.length && (
        <>
          {readContent.map((content, i) => (
            <div key={i} className="read-content" ref={readInputRef}>
              {content}
            </div>
          ))}
        </>
      )}
      {mode === 'write' && (
        <div>
          <textarea className="write-content" ref={writeInputRef} />
          {isSending && (
            <div className="write-sending" onClick={onSend}>
              Sending...
            </div>
          )}
          {!isSending && (
            <button className="send-button" onClick={onSend}>
              Send
            </button>
          )}
        </div>
      )}
      <div className="connections">
        {connections?.map(({ id }, index) => (
          <div key={index} className="connection-name" title={id}>
            *
          </div>
        ))}
      </div>

      {isSending && (
        <div className="qrcode">
          <Qrcode
            height={200}
            text={`${document.location.origin}?read=${topic}`}
            width={200}
            color={{
              dark: '#fff',
              light: '#202124',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default App
