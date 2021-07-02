import { useCallback, useEffect, useRef, useState } from 'react'

import './App.css'
import usePaperslip from './hooks/usePaperslip'

function App() {
  const { hash, read, stopWrite, write } = usePaperslip()

  const readStream = useRef()
  const readInputRef = useRef()
  const writeInputRef = useRef()

  const [topic, setTopic] = useState('')
  const [readContent, setReadContent] = useState('')

  useEffect(() => {
    const query = window.location.search.substring(1)
    if (query.split('=')?.[0] === 'topic') {
      setTopic(query.split('=')?.[1])
    }
  }, [])

  useEffect(() => {
    if (topic) {
      readStream.current = read(topic)
      readStream.current.on('data', (data) => {
        const string = data.toString('utf8')
        console.log(data, string)
        setReadContent(string)
      })
    }
  }, [read, readStream, topic])

  const onWriteInputChange = useCallback(
    (e) => {
      const value = e.target.value
      const net = write(topic, value)
    },
    [topic, write],
  )

  return (
    <div className="App">
      <div className="read-content" ref={readInputRef}>
        {readContent}
      </div>
      <input
        className="write-content"
        onChange={onWriteInputChange}
        ref={writeInputRef}
      ></input>
    </div>
  )
}

export default App
