import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import jsQR from 'jsqr'; // Import jsQR for decoding QR codes
import '../styles/styles.css'; // Import your styles

const QRScanner = () => {
  const videoRef = useRef(null); // Reference for the video element
  const canvasRef = useRef(null); // Reference for the canvas element
  const [isScanning, setIsScanning] = useState(false); // State to track scanning status
  const [qrResult, setQrResult] = useState(''); // State to store QR code result
  const [model, setModel] = useState(null); // State to store the model

  // Dynamically load COCO-SSD model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.setBackend('webgl');
        const loadedModel = await tf.loadGraphModel(
          'https://tfhub.dev/tensorflow/coco-ssd/1'
        ); // Load the COCO-SSD model
        setModel(loadedModel);
        console.log('COCO-SSD model loaded successfully');
      } catch (error) {
        console.error('Error loading model:', error);
      }
    };

    loadModel();

    // Access the user's rear camera
    const initScanner = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Request rear-facing camera
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsScanning(true);
    };

    initScanner();

    return () => {
      const tracks = videoRef.current?.srcObject?.getTracks();
      tracks?.forEach((track) => track.stop());
    };
  }, []);

  // Function to scan for QR codes
  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning || !model) {
      return; // Ensure that video, canvas, and model are available
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    // Ensure video dimensions are available
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(scanQRCode);
      return;
    }

    // Set canvas dimensions to match the video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame on the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert the canvas image to image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Use jsQR to decode QR codes in the image data
    const code = jsQR(imageData.data, canvas.width, canvas.height);
    if (code) {
      setQrResult(code.data); // Set the QR code result
      setIsScanning(false); // Stop scanning
      return;
    }

    // Perform object detection using COCO-SSD to detect objects (QR code-like)
    const imageTensor = tf.browser.fromPixels(canvas);
    const predictions = await model.detect(imageTensor);

    // Look for a detected object that resembles a QR code (based on bounding box)
    predictions.forEach((prediction) => {
      // Check if an object is detected with high confidence (adjust threshold)
      if (prediction.score > 0.5) {
        console.log('Object detected:', prediction);
        // If you have a condition to identify QR-like objects, apply it here
        // For example, you can check the object class or bounding box aspect ratio.
      }
    });

    // Continue scanning if no QR code is detected
    requestAnimationFrame(scanQRCode);
  };

  useEffect(() => {
    if (isScanning && model) {
      scanQRCode();
    }
  }, [isScanning, model]);

  return (
    <div className="scanner-container">
      <h2>QR Code Scanner</h2>
      {qrResult ? (
        <div className="qr-result">
          <p>QR Code Result:</p>
          <p>{qrResult}</p>
        </div>
      ) : (
        <p>{isScanning ? 'Scanning...' : 'Initializing...'}</p>
      )}

      {/* Video element to preview the camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="video-preview"
      ></video>

      {/* Hidden canvas used for processing video frames */}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default QRScanner;
