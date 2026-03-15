import { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create scanner instance using a unique div ID
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA
        ],
        rememberLastUsedCamera: true,
      },
      /* verbose= */ false
    );

    const onScanSuccess = (decodedText: string) => {
      // Pause scanner after successful scan
      scanner.pause();
      onScan(decodedText);
      
      // Delay to allow user to see success before auto-close (optional)
      setTimeout(() => {
         onClose();
      }, 500);
    };

    const onScanFailure = (errorMessage: string) => {
      // html5-qrcode triggers this frequently while scanning, don't show UI errors for it.
      // setError(errorMessage);
    };

    scanner.render(onScanSuccess, onScanFailure);

    // Cleanup when component unmounts
    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scan Barcode / QR</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div 
          id="reader" 
          className="overflow-hidden rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600"
        ></div>
        
        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
        
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Point your camera at a barcode to scan.
        </p>
      </div>
    </div>
  );
}
