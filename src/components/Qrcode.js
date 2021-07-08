import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

const Qrcode = ({ color, text, width = 300, height = 300 }) => {
  const canvas = useRef(null)

  useEffect(() => {
    const opts = {
      color,
    }
    QRCode.toCanvas(canvas.current, text, opts, (error) => {
      if (error) console.error(error)
      console.log('success!')
    })
  }, [color, text])

  return <canvas ref={canvas} width={width} height={height} />
}

export default Qrcode
