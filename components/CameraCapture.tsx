"use client";

import { useState, useRef, useEffect } from "react";

interface CameraCaptureProps {
  onCapture: (faceHash: string, timestamp: number) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function CameraCapture({
  onCapture,
  onError,
  disabled,
}: CameraCaptureProps) {
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isStreaming && streamRef.current && videoRef.current) {
      if (!videoRef.current.srcObject) {
        console.log("setting video stream in useeffect");
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((err) => {
          console.error("error playing video:", err);
          setError("Failed to start video stream");
        });

        startFaceDetection();
      }
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isStreaming]);

  const detectFace = async (): Promise<boolean> => {
    if (!videoRef.current || !canvasRef.current) {
      return false;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return false;
    }

    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let skinTonePixels = 0;
      let faceRegionPixels = 0;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const faceRegionRadius = Math.min(canvas.width, canvas.height) * 0.3;

      for (
        let y = centerY - faceRegionRadius;
        y < centerY + faceRegionRadius;
        y += 4
      ) {
        for (
          let x = centerX - faceRegionRadius;
          x < centerX + faceRegionRadius;
          x += 4
        ) {
          if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height)
            continue;

          const idx = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const brightness = (r + g + b) / 3;

          if (r > g && g > b && brightness > 60 && brightness < 220) {
            skinTonePixels++;
          }
          faceRegionPixels++;
        }
      }

      const skinToneRatio =
        faceRegionPixels > 0 ? skinTonePixels / faceRegionPixels : 0;
      const hasFace = skinToneRatio > 0.15;

      return hasFace;
    } catch (err) {
      console.error("face detection error:", err);
      return false;
    }
  };

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    setDetectingFace(true);

    detectionIntervalRef.current = setInterval(async () => {
      const detected = await detectFace();
      setFaceDetected(detected);
    }, 500);
  };

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg =
          "Camera API not available. Please use a modern browser with HTTPS.";
        setError(errorMsg);
        onError(errorMsg);
        console.error("getusermedia not available");
        setIsLoading(false);
        return;
      }

      console.log("requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      console.log("camera access granted, setting up video...");
      streamRef.current = stream;

      setIsStreaming(true);
      setCaptured(false);
      setIsLoading(false);
      console.log("streaming state set, useeffect will set video stream...");
    } catch (err: any) {
      console.error("camera error:", err);
      const errorMsg =
        err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera access and try again."
          : err.name === "NotFoundError"
          ? "No camera found. Please connect a camera and try again."
          : err.name === "NotReadableError"
          ? "Camera is already in use by another application."
          : err.name === "OverconstrainedError"
          ? "Camera constraints not supported. Trying with default settings..."
          : `Failed to access camera: ${
              err.message || err.name || "Unknown error"
            }`;

      setError(errorMsg);
      onError(errorMsg);

      if (err.name === "OverconstrainedError") {
        try {
          console.log("retrying with simpler constraints...");
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
            console.log("video stream started with default constraints");
            return;
          }
        } catch (retryErr: any) {
          console.error("retry failed:", retryErr);
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
      streamRef.current.getTracks().forEach((track) => track.stop());
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
      onError("Camera not ready");
      return;
    }

    const hasFace = await detectFace();
    if (!hasFace) {
      setError(
        "No face detected. Please position yourself in front of the camera."
      );
      onError("No face detected in the image");
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        onError("Failed to get canvas context");
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const timestamp = new Date();
      const timestampString = timestamp.toISOString();

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "left";
      ctx.fillText("Authentica Proof", 10, canvas.height - 35);

      ctx.font = "16px Arial";
      ctx.fillText(timestampString, 10, canvas.height - 10);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          onError("Failed to capture image");
          return;
        }

        try {
          const arrayBuffer = await blob.arrayBuffer();

          const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const faceHash = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          setCaptured(true);
          stopCamera();
          onCapture(faceHash, timestamp.getTime());
        } catch (err: any) {
          onError("Failed to process image: " + err.message);
        }
      }, "image/png");
    } catch (err: any) {
      onError("Failed to capture photo: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/80 rounded-lg p-4 border border-green-200/50">
        <h3 className="text-lg font-semibold text-stone-800 mb-2">
          Face Verification
        </h3>
        <p className="text-sm text-stone-600 mb-4">
          Capture a photo to prove you&apos;re a real human creator. Only the
          hash is stored, not your image.
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
            {isLoading ? "Requesting camera access..." : "Start Camera"}
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
                style={{ minHeight: "240px" }}
                onLoadedMetadata={() => {
                  console.log("video metadata loaded");
                }}
                onError={(e) => {
                  console.error("video error:", e);
                  setError("Failed to load video stream");
                }}
              />
              <canvas ref={canvasRef} className="hidden" />

              {detectingFace && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                  {faceDetected ? (
                    <span className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Face detected
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="animate-pulse"></span> Detecting face...
                    </span>
                  )}
                </div>
              )}
            </div>

            {!faceDetected && detectingFace && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  Please position your face in front of the camera. Face
                  detection is required.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={capturePhoto}
                disabled={!faceDetected}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
              >
                Capture Photo {faceDetected ? "" : "(Face required)"}
              </button>
              <button
                onClick={stopCamera}
                className="flex-1 bg-stone-400 text-white py-2 px-4 rounded-lg font-semibold hover:bg-stone-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {captured && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl"></span>
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
