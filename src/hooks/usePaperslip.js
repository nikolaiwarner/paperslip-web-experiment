import { Readable } from 'stream'
import { useCallback } from 'react'
import crypto from 'crypto-browserify'
import duplexify from 'duplexify'
import hcrypto from 'hypercore-crypto'
import hyperswarm from 'hyperswarm-web'

export default function usePaperslip() {
  const hash = useCallback((topic) => {
    const hash = crypto.createHash('sha256').update(topic).digest()
    return hcrypto.discoveryKey(hash)
  }, [])

  const initiate = useCallback(
    (topic, opts) => {
      const net = hyperswarm()
      // look for peers listed under this topic
      // hash topic in a way which makes observing the DHT to derive the actual topic implausible
      const topicHash = hash(topic)
      net.join(topicHash, opts)
      return net
    },
    [hash],
  )

  const read = useCallback(
    (topic, cb) => {
      if (!cb) cb = () => {}
      const stream = duplexify()
      const net = initiate(topic, {
        lookup: true, // find & connect to peers
      })

      net.on('connection', (socket, details) => {
        stream.setReadable(socket)
        // we have received everything
        socket.on('end', () => {
          net.leave(hash(topic))
          cb()
        })
        socket.on('error', (err) => {
          stream.destroy(err)
        })
        net.on('error', (err) => {
          stream.destroy(err)
        })
      })
      return stream
    },
    [hash, initiate],
  )

  const write = useCallback(
    (topic, data, log) => {
      if (!log) log = function () {}
      const net = initiate(topic, {
        lookup: true, // find & connect to peers
        announce: true, // optional- announce self as a connection target
      })

      net.on('connection', (socket, details) => {
        log(`${Object.values(socket.address()).join(':')} connected`)
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
    net.destroy()
  }, [])

  return { hash, read, stopWrite, write }
}
