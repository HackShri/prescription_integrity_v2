import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { getPrescriptionById } from '../api/prescriptionService';
import { QrCode } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';

const Scanner = () => {
  const [scannedPrescription, setScannedPrescription] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let animationFrameId;

    const startScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scanQR();
        }
      } catch (err) {
        setError('Failed to access camera. Please grant permission or try another device.');
      }
    };

    const scanQR = () => {
      if (!isScanning) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          try {
            const data = JSON.parse(code.data);
            fetchPrescription(data.prescriptionId);
            setIsScanning(false);
          } catch (err) {
            setError('Invalid QR code format');
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanQR);
    };

    const delayScanner = setTimeout(() => {
      startScanner();
    }, 1000);

    return () => {
      clearTimeout(delayScanner);
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning]);

  const fetchPrescription = async (id) => {
    try {
      const { data } = await getPrescriptionById(id);
      setScannedPrescription(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch prescription');
    }
  };

  const resetScanner = () => {
    setScannedPrescription(null);
    setError('');
    setIsScanning(true);
  };

  return (
    <div className="min-h-screen bg-brand-50 p-6">
      <h2 className="text-3xl font-bold mb-6 text-center text-brand-700">QR Code Scanner</h2>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="w-full max-w-2xl mx-auto card-style">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-slate-900">
            <QrCode className="w-6 h-6 text-brand-600" />
            <span>Scan Prescription QR Code</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isScanning && <video ref={videoRef} className="w-full rounded-lg border border-border/60" />}
          {scannedPrescription && (
            <div className="mt-4 space-y-3 text-slate-700">
              <p><span className="font-semibold text-slate-900">Patient Email:</span> {scannedPrescription.patientEmail}</p>
              <p><span className="font-semibold text-slate-900">Instructions:</span> {scannedPrescription.instructions}</p>
              <div>
                  <p className="font-semibold text-slate-900">Medications:</p>
                  {scannedPrescription.medications && scannedPrescription.medications.length > 0 ? (
                    scannedPrescription.medications.map((med, index) => (
                      <div key={index} className="ml-4 mb-2 p-3 bg-brand-50 border border-brand-100 rounded-lg">
                        <p className="font-semibold text-slate-900">{med.name} - {med.dosage}</p>
                        <p className="text-sm text-slate-600">Quantity: {med.quantity}</p>
                        {med.frequency && <p className="text-sm text-slate-600">Frequency: {med.frequency}</p>}
                        {med.timing && <p className="text-sm text-slate-600">Timing: {med.timing}</p>}
                        {med.duration && <p className="text-sm text-slate-600">Duration: {med.duration}</p>}
                        {med.instructions && <p className="text-sm text-slate-600 italic">Note: {med.instructions}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="ml-4 text-slate-500 italic">No medications specified</p>
                  )}
                </div>
              <p><span className="font-semibold text-slate-900">Usage:</span> {scannedPrescription.used} / {scannedPrescription.usageLimit}</p>
              <p><span className="font-semibold text-slate-900">Expiration Date:</span> {new Date(scannedPrescription.expiresAt).toLocaleDateString()}</p>
              <div>
                <p className="font-semibold text-slate-900 mb-2">Doctor Signature:</p>
                <img src={scannedPrescription.doctorSignature} alt="Doctor Signature" className="h-20 rounded border border-border/70" />
              </div>
              <Button onClick={resetScanner} className="mt-4 w-full button-style">
                Scan Another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Scanner;