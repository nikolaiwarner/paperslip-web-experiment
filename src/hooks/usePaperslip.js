import { Readable } from 'stream'
import { useCallback } from 'react'
import { useRef, useState } from 'react'
import crypto from 'crypto-browserify'
import duplexify from 'duplexify'
import hcrypto from 'hypercore-crypto'
import hyperswarm from 'hyperswarm-web'

export default function usePaperslip({ topic }) {
  const [connections, setConnections] = useState([])

  const net = useRef(null)

  const hash = useCallback(() => {
    const hash = crypto.createHash('sha256').update(topic).digest()
    return hcrypto.discoveryKey(hash)
  }, [topic])

  const initiate = useCallback(
    (opts) => {
      if (!net.current) {
        net.current = hyperswarm({
          // bootstrap: ['ws://localhost:4977'],
        })
        // look for peers listed under this topic
        // hash topic in a way which makes observing the DHT to derive the actual topic implausible
        const topicHash = hash(topic)
        console.log('net join', { opts, net: net.current, topic, topicHash })
        try {
          net.current.join(topicHash, { lookup: true, ...(opts ?? {}) })
        } catch (error) {
          console.warn('net join error', error)
        }
      }
    },
    [hash, topic],
  )

  const connectionEnded = useCallback((details) => {
    setConnections((previousConnections) =>
      previousConnections.filter(
        (connection) => connection.details.peer.host !== details.peer.host,
      ),
    )
  }, [])

  const leaveNet = useCallback(() => {
    net.current.leave(hash(topic))
    setConnections([])
  }, [hash, topic])

  const read = useCallback(() => {
    console.log('setup read')
    initiate()

    const stream = duplexify()

    net.current?.on('connection', (socket, details) => {
      const id = crypto.createHash('sha256').update(details.peer.host).digest('hex')
      if (connections.find((connection) => connection.id === id)) return

      console.log('READ: connected to', { details, id })

      setConnections((prevousConnections) =>
        (prevousConnections ?? []).concat({
          id,
          details,
          socket,
        }),
      )

      // stream.setReadable(socket)

      // we have received everything
      socket.on('end', () => {
        console.log(`socket end`)
        leaveNet()
        connectionEnded(details)
      })
      socket.on('error', (err) => {
        console.log(`socket error`, { err })
        connectionEnded(details)
        stream.destroy(err)
      })
    })
    net.current?.on('error', (err) => {
      console.warn(`net error`)
      leaveNet()
      stream.destroy(err)
    })

    return stream
  }, [connectionEnded, connections, initiate, leaveNet])

  const write = useCallback(
    (data) => {
      initiate({ announce: true }) // announce self as a connection target
      // initiate()

      net.current?.on('connection', (socket, details) => {
        console.log(`WRITE: connected to`, { details })
        let stream = data
        // we were passed a string note, encompass the data in a stream
        if (typeof data === 'string') {
          stream = new Readable()
          stream.push(data)
          stream.push(null)
        }
        stream.pipe(socket)
        // signal to the remote peer that we sent all data
        stream.on('end', function () {
          socket.end()
        })
      })
      return net
    },
    [initiate],
  )

  const stopWrite = useCallback((net) => {
    net.current?.destroy()
  }, [])

  return { hash, read, stopWrite, write, connections }
}
