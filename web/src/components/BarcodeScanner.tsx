import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Keyboard, 
  Zap, 
  Minimize2, 
  Maximize2, 
  X,
  AlertCircle,
  RefreshCw,
  Camera
} from 'lucide-react';
import { cn } from '../lib/utils';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [isFlash, setIsFlash] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [isZoomed, setIsZoomed] = React.useState(false);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    const startScanner = async () => {
      // Small delay to ensure previous cleanup completed
      await new Promise(resolve => setTimeout(resolve, 150));
      if (!isMounted) return;

      try {
        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        setError(null);

        const config = { 
          fps: 60, 
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const sizeWidth = Math.floor(minEdge * 0.85);
            const sizeHeight = Math.floor(sizeWidth * 0.45);
            return { width: sizeWidth, height: sizeHeight };
          },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (!isMounted) return;
            setIsFlash(true);
            if (window.navigator?.vibrate) window.navigator.vibrate(100);
            
            setTimeout(() => {
              if (isMounted) {
                onScan(decodedText);
                handleStop();
              }
            }, 150);
          },
          undefined
        );
      } catch (err: any) {
        if (!isMounted) return;
        console.warn("Scanner failed to start:", err);
        setError("Camera access required. Please check permissions and ensure no other app is using the camera.");
      }
    };

    startScanner();

    const handleStop = async () => {
      try {
        if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Stop error", err);
      }
    };

    return () => {
      isMounted = false;
      handleStop();
    };
  }, [onScan, retryCount]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden font-mono"
    >
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,124,81,0.15)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.3)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Top Header - Glass Design */}
      <div className="relative z-10 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm border-b border-white/5">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="flex items-center gap-2 text-white/90 font-bold px-4 py-2 rounded-2xl bg-white/5 border border-white/10"
        >
          <X className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-widest">Cancel</span>
        </motion.button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-emerald-500 mb-0.5">
            <Zap className="w-3 h-3 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Live</span>
          </div>
          <span className="text-white font-black text-sm uppercase tracking-tighter">Barcode Engine v2.0</span>
        </div>

        <button 
          onClick={() => setIsZoomed(!isZoomed)}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/70"
        >
          {isZoomed ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Scanner Container */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Decorative HUD Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-8 opacity-20">
            {[1, 2, 3, 4].map(i => <div key={i} className="w-1 h-1 bg-white rounded-full" />)}
          </div>
          <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-8 opacity-20">
            {[1, 2, 3, 4].map(i => <div key={i} className="w-1 h-1 bg-white rounded-full" />)}
          </div>
        </div>

        <motion.div 
          animate={isZoomed ? { scale: 1.2 } : { scale: 1 }}
          className="relative w-full max-w-sm aspect-square flex items-center justify-center p-8 transition-all duration-500"
        >
          {/* Scanner Window Clipping */}
          <div className="relative w-full h-full rounded-[3rem] overflow-hidden bg-zinc-900 shadow-[0_0_80px_rgba(16,124,81,0.2)] border border-white/10">
            <div id="reader" className="w-full h-full object-cover scale-[1.02]" />
            
            {/* Dark Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-black/30" />

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/95 backdrop-blur-xl"
                >
                  <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-3xl flex items-center justify-center mb-6 border border-rose-500/30">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">Protocol Warning</h4>
                  <p className="text-zinc-500 text-xs leading-relaxed mb-8 max-w-[200px]">{error}</p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRetryCount(prev => prev + 1)}
                    className="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Re-initialize
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Floating UI Elements */}
          {!error && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Scan Reticle */}
              <div className="relative w-[300px] h-[140px] flex items-center justify-center">
                {/* corner tech borders */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-emerald-500/80 rounded-tl-[1.5rem]" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-emerald-500/80 rounded-tr-[1.5rem]" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-emerald-500/80 rounded-bl-[1.5rem]" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-emerald-500/80 rounded-br-[1.5rem]" />

                {/* Scan Area Glare */}
                <div className="absolute inset-4 bg-gradient-to-b from-white/[0.03] to-transparent rounded-xl" />

                {/* Animated Scan Line */}
                <motion.div 
                  initial={{ top: "10%" }}
                  animate={{ top: "90%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-4 right-4 h-0.5 z-10"
                >
                  <div className="w-full h-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                </motion.div>

                {/* Internal crosshairs */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-0.5 bg-emerald-500/30" />
                  <div className="w-0.5 h-4 bg-emerald-500/30" />
                </div>
              </div>

              {/* Status Labels */}
              <motion.div 
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-4 left-4 flex gap-4 text-[8px] font-black uppercase text-emerald-400/60"
              >
                <span>SENS_HIGH</span>
                <span>ENC_UTF8</span>
              </motion.div>
            </div>
          )}

          {/* Flash Feedback */}
          <AnimatePresence>
            {isFlash && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 pointer-events-none bg-white/20 blur-xl"
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer Controls */}
      <div className="relative z-10 p-8 pb-12 bg-gradient-to-t from-black to-transparent backdrop-blur-sm border-t border-white/5">
        <div className="max-w-xs mx-auto space-y-6">
          <div className="flex flex-col items-center gap-1">
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,124,81,1)]" 
            />
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] pt-2">Align with target sequence</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex flex-col items-center justify-center p-5 rounded-[2rem] bg-white/5 border border-white/10 text-white/80 group"
            >
              <Keyboard className="w-6 h-6 mb-2 group-hover:text-emerald-400 transition-colors" />
              <span className="text-[8px] font-black uppercase tracking-widest text-center">Manual Entry</span>
            </motion.button>

            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col items-center justify-center p-5 rounded-[2rem] bg-emerald-600 border border-emerald-500 shadow-[0_0_30px_rgba(16,124,81,0.3)] text-white group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              <Camera className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-[8px] font-black uppercase tracking-widest text-center">Auto Capture</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BarcodeScanner;

