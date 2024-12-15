import jsQR from 'jsqr';

// Function to use jsQR for QR code detection
export const detectQRCode = async (imageTensor) => {
  // Convert the TensorFlow.js tensor to an ImageData object for jsQR
  const imageData = await imageTensor.toImageData();

  // Decode the QR code using jsQR
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  if (code) {
    console.log('QR Code detected:', code.data);
    return code.data; // Return the QR code data
  } else {
    console.log('No QR code detected');
    return null; // Return null if no QR code is found
  }
};
