import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, Camera, AlertCircle, CheckCircle, Keyboard } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScanner({ open, onClose, onBarcodeDetected }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | starting | scanning | found | error
  const [errorMsg, setErrorMsg] = useState("");
  const [lastDetected, setLastDetected] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [mode, setMode] = useState("camera"); // camera | manual

  const stopScanning = () => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch (_) {}
      controlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startScanning = async () => {
    setStatus("starting");
    setErrorMsg("");
    setLastDetected(null);

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Get back camera if available
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const backCamera = devices.find(d =>
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("rear") ||
        d.label.toLowerCase().includes("environment")
      );
      const deviceId = backCamera?.deviceId ?? (devices[devices.length - 1]?.deviceId);

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const code = result.getText();
            setLastDetected(code);
            setStatus("found");
            stopScanning();
            setTimeout(() => {
              onBarcodeDetected(code);
              onClose();
            }, 800);
          }
          // NotFoundException is normal (no barcode in frame), ignore it
        }
      );

      controlsRef.current = controls;
      setStatus("scanning");
    } catch (err) {
      setStatus("error");
      if (err.name === "NotAllowedError") {
        setErrorMsg("Camera permission denied. Please allow camera access and try again.");
      } else if (err.name === "NotFoundError" || err.message?.includes("No video input devices")) {
        setErrorMsg("No camera found on this device.");
      } else {
        setErrorMsg(`Camera error: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    if (open && mode === "camera") {
      startScanning();
    }
    if (!open) {
      stopScanning();
      setStatus("idle");
      setLastDetected(null);
      setManualCode("");
      setMode("camera");
    }
    return () => stopScanning();
  }, [open]);

  useEffect(() => {
    if (open) {
      if (mode === "camera") {
        startScanning();
      } else {
        stopScanning();
        setStatus("idle");
      }
    }
  }, [mode]);

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onBarcodeDetected(manualCode.trim());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-indigo-600" />
            Barcode Scanner
          </DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mx-5 mt-4">
          <button
            onClick={() => setMode("camera")}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${mode === "camera" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}
          >
            <Camera className="h-3.5 w-3.5" /> Camera
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${mode === "manual" ? "bg-white shadow text-slate-900" : "text-slate-500"}`}
          >
            <Keyboard className="h-3.5 w-3.5" /> Manual
          </button>
        </div>

        <div className="px-5 pb-5 pt-3 space-y-3">
          {/* ── Camera mode ── */}
          {mode === "camera" && (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Scan frame overlay */}
                {status === "scanning" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-56 h-36">
                      <div className="absolute top-0 left-0 w-7 h-7 border-t-3 border-l-3 border-indigo-400 rounded-tl-md" style={{borderWidth: 3}} />
                      <div className="absolute top-0 right-0 w-7 h-7 border-t-3 border-r-3 border-indigo-400 rounded-tr-md" style={{borderWidth: 3}} />
                      <div className="absolute bottom-0 left-0 w-7 h-7 border-b-3 border-l-3 border-indigo-400 rounded-bl-md" style={{borderWidth: 3}} />
                      <div className="absolute bottom-0 right-0 w-7 h-7 border-b-3 border-r-3 border-indigo-400 rounded-br-md" style={{borderWidth: 3}} />
                      {/* Animated scan line */}
                      <div className="absolute inset-x-3 h-0.5 bg-indigo-400 opacity-80 animate-bounce" style={{top: "50%"}} />
                    </div>
                  </div>
                )}

                {status === "starting" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="text-center text-white">
                      <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">Starting camera…</p>
                    </div>
                  </div>
                )}

                {status === "found" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/80">
                    <div className="text-center text-white">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-400" />
                      <p className="text-sm font-semibold">Barcode Detected!</p>
                      <p className="text-xs mt-1 opacity-80 font-mono">{lastDetected}</p>
                    </div>
                  </div>
                )}

                {status === "idle" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Camera className="h-10 w-10 text-slate-400" />
                  </div>
                )}
              </div>

              {status === "error" && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700">{errorMsg}</p>
                </div>
              )}

              {status === "scanning" && (
                <p className="text-xs text-center text-slate-500">
                  Point camera at a barcode — it will detect automatically.
                </p>
              )}

              <div className="flex gap-2">
                {status === "error" && (
                  <Button onClick={startScanning} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                    <Camera className="h-4 w-4 mr-2" /> Try Again
                  </Button>
                )}
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          )}

          {/* ── Manual mode ── */}
          {mode === "manual" && (
            <>
              <p className="text-sm text-slate-500 text-center">Enter the barcode or Product ID manually.</p>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  placeholder="e.g. 012345678901"
                  autoFocus
                  className="flex-1 font-mono"
                  inputMode="numeric"
                />
                <Button type="submit" disabled={!manualCode.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Use
                </Button>
              </form>
              <Button variant="outline" onClick={handleClose} className="w-full">Close</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}