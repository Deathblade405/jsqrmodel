import * as tf from '@tensorflow/tfjs';

// Variable to store the model
let model = null;

// Function to load the model
export const loadModel = async () => {
  try {
    // Try loading the model (replace the URL with a correct model URL if necessary)
    model = await tf.loadGraphModel('https://tfhub.dev/tensorflow/ssd_mobilenet_v2/2', { fromTFHub: true });
    console.log('Model loaded successfully.');
  } catch (error) {
    console.error('Error loading model:', error);
  }
};

// Function to use the model for QR detection
export const detectQRCode = async (imageTensor) => {
  if (!model) {
    console.error('Model not loaded.');
    return null;
  }
  // Get predictions from the model
  const predictions = await model.executeAsync(imageTensor);
  return predictions;
};
