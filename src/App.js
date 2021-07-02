import { useCallback, useEffect, useRef, useState } from 'react'

import './App.css'
import usePaperslip from './hooks/usePaperslip'

function App() {
  const { read, write } = usePaperslip()

  const [isSending, setIsSending] = useState(false)
  const [mode, setMode] = useState('write')
  const [readContent, setReadContent] = useState('')
  const [topic, setTopic] = useState('')

  const readStream = useRef()
  const writeNet = useRef()
  const readInputRef = useRef()
  const writeInputRef = useRef()

  useEffect(() => {
    const query = window.location.search.substring(1)
    setMode(query.split('=')?.[0] === 'read' ? 'read' : 'write')
    setTopic(query.split('=')?.[1])
  }, [])

  useEffect(() => {
    if (topic) {
      readStream.current = read(topic)
      readStream.current.on('data', (data) => {
        const string = data.toString('utf8')
        console.log(data, string, readStream.current)
        setReadContent(string)
      })
    }
  }, [read, readStream, topic])

  const onSend = useCallback(() => {
    const message = writeInputRef.current.value
    writeNet.current = write(topic, message)
    console.log(writeNet.current)
    setIsSending(true)
  }, [topic, write])

  return (
    <div className="App">
      <div className="topic">{topic}</div>
      {mode === 'read' && (
        <div className="read-content" ref={readInputRef}>
          {readContent}
        </div>
      )}
      {mode === 'write' && (
        <div>
          <textarea className="write-content" ref={writeInputRef} />
          {isSending && <div className="write-sending">Sending...</div>}
          {!isSending && (
            <button className="send-button" onClick={onSend}>
              Send
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default App
