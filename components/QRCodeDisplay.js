import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (data && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, data, (error) => {
        if (error) console.error(error);
      });
    }
  }, [data]);

  return <canvas ref={canvasRef} />;
}