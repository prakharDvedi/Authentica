/**
 * Camera Capture Component
 * Captures webcam photo with timestamp overlay and creates hash
 * Includes basic face detection to ensure a person is present
 * Only stores hash, not the actual image (privacy-first)
 */

'use client';

import { useState, useRef, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (faceHash: string, timestamp: number) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function CameraCapture({ onCapture, onError, disabled }: CameraCaptureProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectingFace, setDetectingFace] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup: stop camera stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Effect to set video stream when video element is rendered
  useEffect(() => {
    if (isStreaming && streamRef.current && videoRef.current) {
      if (!videoRef.current.srcObject) {
        console.log('Setting video stream in useEffect');
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
          setError('Failed to start video stream');
        });
        
        // Start face detection once video is playing
        startFaceDetection();
      }
    }
    
    return () => {
      // Cleanup detection interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isStreaming]);

  // Simple face detection using canvas and basic image analysis
  const detectFace = async (): Promise<boolean> => {
    if (!videoRef.current || !canvasRef.current) {
      return false;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return false;
    }

    try {
      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Simple face detection heuristic:
      // Look for skin-tone colors and face-like patterns
      // This is a basic check - for production, use a proper face detection library
      
      let skinTonePixels = 0;
      let faceRegionPixels = 0;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const faceRegionRadius = Math.min(canvas.width, canvas.height) * 0.3;

      // Analyze pixels in the center region (where face typically is)
      for (let y = centerY - faceRegionRadius; y < centerY + faceRegionRadius; y += 4) {
        for (let x = centerX - faceRegionRadius; x < centerX + faceRegionRadius; x += 4) {
          if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
          
          const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const brightness = (r + g + b) / 3;

          // Skin tone detection (simplified)
          // Skin tones typically have: R > G > B, and moderate brightness
          if (r > g && g > b && brightness > 60 && brightness < 220) {
            skinTonePixels++;
          }
          faceRegionPixels++;
        }
      }

      // If we have enough skin-tone pixels in the center region, likely a face
      const skinToneRatio = faceRegionPixels > 0 ? skinTonePixels / faceRegionPixels : 0;
      const hasFace = skinToneRatio > 0.15; // Threshold: 15% of center region should be skin-tone

      return hasFace;
    } catch (err) {
      console.error('Face detection error:', err);
      return false;
    }
  };

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    setDetectingFace(true);
    
    // Check for face every 500ms
    detectionIntervalRef.current = setInterval(async () => {
      const detected = await detectFace();
      setFaceDetected(detected);
    }, 500);
  };

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = 'Camera API not available. Please use a modern browser with HTTPS.';
        setError(errorMsg);
        onError(errorMsg);
        console.error('getUserMedia not available');
        setIsLoading(false);
        return;
      }

      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front-facing camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      console.log('Camera access granted, setting up video...');
      streamRef.current = stream;
      
      // Set streaming state first so video element is rendered
      // The useEffect will handle setting the stream once the element is rendered
      setIsStreaming(true);
      setCaptured(false);
      setIsLoading(false);
      console.log('Streaming state set, useEffect will set video stream...');
    } catch (err: any) {
      console.error('Camera error:', err);
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera access and try again.'
        : err.name === 'NotFoundError'
        ? 'No camera found. Please connect a camera and try again.'
        : err.name === 'NotReadableError'
        ? 'Camera is already in use by another application.'
        : err.name === 'OverconstrainedError'
        ? 'Camera constraints not supported. Trying with default settings...'
        : `Failed to access camera: ${err.message || err.name || 'Unknown error'}`;
      
      setError(errorMsg);
      onError(errorMsg);
      
      // Try with simpler constraints if there was an error
      if (err.name === 'OverconstrainedError') {
        try {
          console.log('Retrying with simpler constraints...');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setIsStreaming(true);
            setCaptured(false);
            setError(null);
            setIsLoading(false);
            console.log('Video stream started with default constraints');
            return;
          }
        } catch (retryErr: any) {
          console.error('Retry failed:', retryErr);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setFaceDetected(false);
    setDetectingFace(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      onError('Camera not ready');
      return;
    }

    // Verify face is detected before capturing
    const hasFace = await detectFace();
    if (!hasFace) {
      setError('No face detected. Please position yourself in front of the camera.');
      onError('No face detected in the image');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        onError('Failed to get canvas context');
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Overlay timestamp
      const timestamp = new Date();
      const timestampString = timestamp.toISOString();
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Authentica Proof', 10, canvas.height - 35);
      
      ctx.font = '16px Arial';
      ctx.fillText(timestampString, 10, canvas.height - 10);

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          onError('Failed to capture image');
          return;
        }

        try {
          // Convert blob to array buffer for hashing
          const arrayBuffer = await blob.arrayBuffer();

          // Hash the image using SHA-256 (browser crypto API)
          const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const faceHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          setCaptured(true);
          stopCamera();
          onCapture(faceHash, timestamp.getTime());
        } catch (err: any) {
          onError('Failed to process image: ' + err.message);
        }
      }, 'image/png');
    } catch (err: any) {
      onError('Failed to capture photo: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/80 rounded-lg p-4 border border-green-200/50">
        <h3 className="text-lg font-semibold text-stone-800 mb-2">
          📸 Face Verification
        </h3>
        <p className="text-sm text-stone-600 mb-4">
          Capture a photo to prove you&apos;re a real human creator. Only the hash is stored, not your image.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!isStreaming && !captured && (
          <button
            onClick={startCamera}
            disabled={disabled || isLoading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '⏳ Requesting camera access...' : '📷 Start Camera'}
          </button>
        )}

        {isStreaming && (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ minHeight: '240px' }}
                onLoadedMetadata={() => {
                  console.log('Video metadata loaded');
                }}
                onError={(e) => {
                  console.error('Video error:', e);
                  setError('Failed to load video stream');
                }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Face detection indicator */}
              {detectingFace && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                  {faceDetected ? (
                    <span className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Face detected
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="animate-pulse">⏳</span> Detecting face...
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {!faceDetected && detectingFace && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Please position your face in front of the camera. Face detection is required.
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={capturePhoto}
                disabled={!faceDetected}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
              >
                📸 Capture Photo {faceDetected ? '' : '(Face required)'}
              </button>
              <button
                onClick={stopCamera}
                className="flex-1 bg-stone-400 text-white py-2 px-4 rounded-lg font-semibold hover:bg-stone-500 transition-colors"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {captured && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Face verification captured!
                </p>
                <p className="text-xs text-green-700">
                  Your face hash has been securely stored.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

