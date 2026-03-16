import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCcw } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const unmountedRef = useRef(false);
  const isTransitioningRef = useRef(false);

  const startScanner = useCallback(async (mode: "environment" | "user") => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          try {
            await scannerRef.current.stop();
          } catch(e) {}
        }
        try { scannerRef.current.clear(); } catch(e) {}
      }

      if (unmountedRef.current) {
        isTransitioningRef.current = false;
        return;
      }

      const html5QrCode = new Html5Qrcode("reader-camera", { verbose: false });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: mode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          if (!unmountedRef.current) {
            // First mark as unmounted to prevent double firing
            unmountedRef.current = true; 
            onScan(decodedText);
            onClose();
          }
        },
        (errorMessage) => {
          // Keep silent on frame failure
        }
      );
      if (!unmountedRef.current) setIsReady(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (!unmountedRef.current) {
        if (mode === "environment") {
           console.log("Environment cam failed, trying user cam");
           isTransitioningRef.current = false;
           setFacingMode("user");
           return;
        } else {
           setError("Camera permission denied or device not found.");
        }
      }
    }
    
    isTransitioningRef.current = false;
  }, [onScan, onClose]);

  useEffect(() => {
    unmountedRef.current = false;
    let isTransitioning = false;

    const init = async () => {
      isTransitioning = true;
      await startScanner(facingMode);
      isTransitioning = false;
    };
    
    init();

    return () => {
      unmountedRef.current = true;
      const cleanup = async () => {
         // Wait for any ongoing transition to finish
         while(isTransitioningRef.current) {
            await new Promise(r => setTimeout(r, 50));
         }
         
         if (scannerRef.current) {
           try {
             if (scannerRef.current.isScanning) {
               await scannerRef.current.stop();
             }
           } catch(e) {
             console.log("Error during scanner stop", e);
           }
           try { 
             scannerRef.current.clear(); 
           } catch(e) {}
         }
      };
      cleanup();
    };
  }, [facingMode, startScanner]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
    setIsReady(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent text-white absolute top-0 w-full z-20">
        <h3 className="text-lg font-bold flex items-center gap-2 drop-shadow-md">
            <Camera size={20} />
            Scan Barcode
        </h3>
        <div className="flex items-center gap-4">
            <button
              onClick={toggleCamera}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 transition backdrop-blur-md active:scale-95"
              title="Flip Camera"
            >
              <RefreshCcw size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 transition backdrop-blur-md active:scale-95"
            >
              <X size={24} />
            </button>
        </div>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 w-full h-full flex flex-col justify-center relative bg-black">
        <div id="reader-camera" className="w-full h-full [&>video]:object-cover" style={{ minHeight: '100%' }}></div>

        {/* Safe Area Overlay for User */}
        {isReady && !error && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                <div className="w-[280px] h-[280px] border-2 border-emerald-500 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]">
                    {/* Corners */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-xl"></div>
                    
                    {/* Scanning Line */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500 animate-scan shadow-[0_0_12px_3px_rgba(16,185,129,0.7)]"></div>
                </div>
                <p className="text-white mt-8 font-bold tracking-wider drop-shadow-md text-sm uppercase">Align barcode within frame</p>
            </div>
        )}

        {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80 px-6">
                <div className="text-white text-center p-8 bg-red-950/80 rounded-3xl border border-red-500/50 max-w-sm w-full backdrop-blur-md">
                  <Camera size={48} className="mx-auto mb-4 text-red-400" />
                  <p className="font-bold text-lg mb-2">Camera Unavailable</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
