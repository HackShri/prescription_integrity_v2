import React, { useState, useEffect, useRef } from 'react';
import { getShopHistory, getPrescriptionByShortId, markPrescriptionAsUsed } from '../../api/prescriptionService';
import jsQR from 'jsqr';
import { 
  QrCode, Pill, User, Calendar, CheckCircle, XCircle, AlertTriangle, History, Camera, CameraOff, RotateCcw, Shield, Clock, FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AlertDescription } from '../../components/ui/alert';
import Header from '../../components/layout/Header';

const ShopDashboard = () => {
  const [scannedPrescription, setScannedPrescription] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prescriptionHistory, setPrescriptionHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('scan');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));

  useEffect(() => {
    if (activeTab === 'history') {
      fetchPrescriptionHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    let animationFrameId;
    const startScannerProcess = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scanQR();
        }
      } catch (err) {
        setError('Failed to access camera.');
      }
    };
    const scanQR = () => {
      if (!isScanning) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data.startsWith('RX:')) {
            const shortId = code.data.substring(3);
            fetchPrescription(shortId);
            stopScanner();
        }
      }
      animationFrameId = requestAnimationFrame(scanQR);
    };

    if (isScanning) {
      startScannerProcess();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning]);

  const fetchPrescriptionHistory = async () => {
    try {
      const { data } = await getShopHistory();
      setPrescriptionHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const startScanner = () => {
    setError('');
    setScannedPrescription(null);
    setIsScanning(true);
  };

  const stopScanner = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const fetchPrescription = async (shortId) => {
    try {
      setIsProcessing(true);
      const { data } = await getPrescriptionByShortId(shortId);
      setScannedPrescription(data);
      setSuccess('Prescription found!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch prescription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispenseMedicine = async () => {
    try {
      setIsProcessing(true);
      await markPrescriptionAsUsed(scannedPrescription._id);
      setSuccess('Medicine dispensed successfully!');
      setScannedPrescription(null);
      fetchPrescriptionHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dispense medicine');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScannedPrescription(null);
    setError('');
    setSuccess('');
    if (!isScanning) startScanner();
  };

  const getStatusConfig = (prescription) => {
    const isExpired = new Date(prescription.expiresAt) < new Date();
    const isUsedUp = prescription.used >= prescription.usageLimit;
    if (isExpired) return { status: 'Expired', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100' };
    if (isUsedUp) return { status: 'Used Up', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' };
    return { status: 'Active', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-100' };
  };

  return (
    <div className="min-h-screen gradient-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      <Header />
      <main className="p-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8"><h1 className="text-4xl font-bold">Pharmacy Dashboard</h1><p>Scan prescriptions securely</p></div>
        {success && <div className="alert-success mb-6"><AlertDescription><CheckCircle className="w-5 h-5 mr-2" />{success}</AlertDescription></div>}
        {error && <div className="alert-error mb-6"><AlertDescription><AlertTriangle className="w-5 h-5 mr-2" />{error}</AlertDescription></div>}

        <div className="flex space-x-4 mb-6">
          <Button onClick={() => setActiveTab('scan')} className={activeTab === 'scan' ? 'button-style' : 'button-secondary'}><Camera className="w-4 h-4 mr-2" />Scan</Button>
          <Button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'button-style' : 'button-secondary'}><History className="w-4 h-4 mr-2" />History</Button>
        </div>

        {activeTab === 'scan' && (
          <div className="space-y-6">
            <Card className="card-style">
              <CardHeader><CardTitle><QrCode className="w-6 h-6 inline mr-2" />QR Code Scanner</CardTitle></CardHeader>
              <CardContent>
                {!isScanning && !scannedPrescription && <Button onClick={startScanner}>Start Scanner</Button>}
                {isScanning && <div className="space-y-4"><video ref={videoRef} className="w-full rounded-lg" autoPlay playsInline /><Button onClick={stopScanner}><CameraOff className="w-4 h-4 mr-2" />Stop</Button></div>}
                {isProcessing && <p>Processing...</p>}
              </CardContent>
            </Card>

            {scannedPrescription && (
              <Card className="card-style">
                <CardHeader><CardTitle>Prescription Details</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p><User className="w-4 h-4 inline mr-2" />Patient: {scannedPrescription.patientEmail}</p>
                  <p><Calendar className="w-4 h-4 inline mr-2" />Expires: {new Date(scannedPrescription.expiresAt).toLocaleDateString()}</p>
                  <p><Shield className="w-4 h-4 inline mr-2" />Usage: {scannedPrescription.used} / {scannedPrescription.usageLimit}</p>
                  <div><Pill className="w-4 h-4 inline mr-2" />Medications: {scannedPrescription.medications.map(m => m.name).join(', ')}</div>
                  <Button onClick={handleDispenseMedicine} disabled={isProcessing || getStatusConfig(scannedPrescription).status !== 'Active'}>Dispense</Button>
                  <Button onClick={resetScanner} variant="outline">Scan Another</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <Card className="card-style">
            <CardHeader><CardTitle><History className="w-6 h-6 inline mr-2" />Dispensing History</CardTitle></CardHeader>
            <CardContent>
              {prescriptionHistory.length === 0 ? <p>No history</p> : (
                <div className="space-y-2">
                  {prescriptionHistory.map((p) => <div key={p._id} className="border p-2 rounded">RX #{p._id.slice(-6)} - Patient: {p.patientEmail}</div>)}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ShopDashboard;