import React, { useEffect, useRef, useState } from 'react';
import '../styles/styles.css';  // Import your styles

const QRScanner = () => {
  const videoRef = useRef(null);  // Reference for the video element
  const canvasRef = useRef(null);  // Reference for the canvas element
  const [isScanning, setIsScanning] = useState(false);  // State to track scanning status
  const [qrResult, setQrResult] = useState('');  // State to store QR code result
  const [zoomLevel, setZoomLevel] = useState(1);  // State for zoom level (default is 1)
  const [mediaStream, setMediaStream] = useState(null);  // State to store media stream

  // Dynamically load OpenCV.js
  useEffect(() => {
    const loadOpenCV = () => {
      return new Promise((resolve, reject) => {
        if (window.cv) {
          resolve(window.cv);  // OpenCV.js is already loaded
        } else {
          window.cv.onRuntimeInitialized = () => {
            resolve(window.cv);  // OpenCV.js has finished loading
          };
          // Load the OpenCV.js script
          const script = document.createElement('script');
          script.src = 'https://docs.opencv.org/master/opencv.js';
          script.async = true;
          script.onload = () => resolve(window.cv);
          script.onerror = (err) => reject(err);
          document.body.appendChild(script);
        }
      });
    };

    loadOpenCV()
      .then((cv) => {
        console.log('OpenCV.js loaded');
        // Proceed with QR scanner setup
        initScanner();
      })
      .catch((err) => {
        console.error('Error loading OpenCV.js:', err);
      });

    // Cleanup OpenCV.js if necessary
    return () => {
      const script = document.querySelector('script[src="https://docs.opencv.org/master/opencv.js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  // Initialize the scanner and load OpenCV.js
  const initScanner = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },  // Request rear-facing camera
    });
    setMediaStream(stream);  // Store the media stream
    if (videoRef.current) videoRef.current.srcObject = stream;
    setIsScanning(true);  // Start scanning
  };

  // Function to adjust the zoom level on the camera
  const adjustZoom = (zoom) => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0]; // Get the video track
      const capabilities = videoTrack.getCapabilities();

      // Check if the zoom property is supported by the camera
      if (capabilities.zoom) {
        const maxZoom = capabilities.zoom.max;
        const minZoom = capabilities.zoom.min;
        const newZoom = Math.min(Math.max(zoom, minZoom), maxZoom); // Clamp zoom value between min and max

        videoTrack.applyConstraints({
          advanced: [{ zoom: newZoom }],
        });
      }
    }
  };

  // Function to scan for QR codes using OpenCV.js
  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

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

    // Get the image data from the canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Convert the image data to an OpenCV Mat
    const mat = window.cv.imread(canvas);

    // Create a QRCodeDetector object
    const qrCodeDetector = new window.cv.QRCodeDetector();

    // Detect and decode the QR code
    const [ok, points, decodedText] = qrCodeDetector.detectAndDecode(mat);

    if (ok) {
      // QR code detected successfully
      setQrResult(decodedText);  // Set the QR code result
      setIsScanning(false);  // Stop scanning
      return;
    }

    // Continue scanning if no QR code is detected
    requestAnimationFrame(scanQRCode);
  };

  // Trigger the scanning loop when scanning is enabled
  useEffect(() => {
    if (isScanning) {
      scanQRCode();
    }
  }, [isScanning]);  // Add zoomLevel as dependency if needed

  // Handler to update zoom level
  const handleZoomChange = (event) => {
    const newZoomLevel = parseFloat(event.target.value);
    setZoomLevel(newZoomLevel);  // Update zoom state
    adjustZoom(newZoomLevel);  // Adjust camera zoom
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
