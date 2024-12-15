import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { loadModel, detectQRCode } from './TensorflowModel';  // Import model functions
import jsQR from 'jsqr';  // Import jsQR for decoding QR codes
import '../styles/styles.css';  // Import your styles

const QRScanner = () => {
  const videoRef = useRef(null);  // Reference for the video element
  const canvasRef = useRef(null);  // Reference for the canvas element
  const [isScanning, setIsScanning] = useState(false);  // State to track scanning status
  const [qrResult, setQrResult] = useState('');  // State to store QR code result
  const [modelLoaded, setModelLoaded] = useState(false);  // State to track model load status
  const [zoomLevel, setZoomLevel] = useState(1);  // State for zoom level (default is 1)

  // Initialize the scanner and load TensorFlow model
  useEffect(() => {
    const initScanner = async () => {
      try {
        // Set backend to WebGL, fallback to CPU if WebGL fails
        await tf.setBackend('webgl');
      } catch (err) {
        console.error('WebGL failed, switching to CPU backend');
        await tf.setBackend('cpu');  // Fall back to CPU backend if WebGL is not supported
      }

      // Load the model
      await loadModel();
      setModelLoaded(true);

      // Access the user's rear camera (if available)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },  // Request rear-facing camera
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsScanning(true);  // Start scanning
    };

    initScanner();

    // Cleanup on component unmount (stop camera tracks)
    return () => {
      const tracks = videoRef.current?.srcObject?.getTracks();
      tracks?.forEach((track) => track.stop());
    };
  }, []);

  // Function to scan for QR codes
  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning || !modelLoaded) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    // Ensure video dimensions are available
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(scanQRCode);
      return;
    }

    // Set canvas dimensions to match the video, adjusted by the zoom level
    canvas.width = video.videoWidth * zoomLevel;
    canvas.height = video.videoHeight * zoomLevel;

    // Draw the current video frame on the canvas, also scaling by zoom level
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert the canvas image to a tensor and resize it for performance
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const imageTensor = tf.browser.fromPixels(imageData).resizeBilinear([224, 224]);  // Resize to 224x224

    try {
      // Use TensorFlow model for QR detection (this is optional, you could just use jsQR directly)
      const predictions = await detectQRCode(imageTensor);

      // Decode the QR code using jsQR
      const code = jsQR(imageData.data, canvas.width, canvas.height);
      if (code) {
        setQrResult(code.data);  // Set QR code result
        setIsScanning(false);  // Stop scanning after detection
        return;
      }
    } catch (err) {
      console.error('Error during QR detection:', err);
    }

    requestAnimationFrame(scanQRCode);  // Retry if no QR code is detected
  };

  // Trigger the scanning loop when scanning is enabled and model is loaded
  useEffect(() => {
    if (isScanning && modelLoaded) {
      scanQRCode();
    }
  }, [isScanning, modelLoaded, zoomLevel]);  // Add zoomLevel as dependency

  // Handler to update zoom level
  const handleZoomChange = (event) => {
    setZoomLevel(parseFloat(event.target.value));
  };

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

      {/* Zoom slider */}
      <div className="zoom-container">
        <label htmlFor="zoom-slider">Zoom:</label>
        <input
          id="zoom-slider"
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={zoomLevel}
          onChange={handleZoomChange}
        />
        <span>{zoomLevel.toFixed(1)}x</span>
      </div>
    </div>
  );
};

export default QRScanner;
