import React, { useState, useEffect, useRef } from 'react';
import { getShopHistory, getPrescriptionByShortId, markPrescriptionAsUsed } from '../../api/prescriptionService';
import { checkDangerousForPrescription, requestVerification, getVerificationStatus } from '../../api/verificationService';
import jsQR from 'jsqr';
import { 
  QrCode, Pill, User, Calendar, CheckCircle, XCircle, AlertTriangle, History, Camera, CameraOff, RotateCcw, Shield, Clock
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
  const [dangerousInfo, setDangerousInfo] = useState({ flagged: [], status: 'none' });
  
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
      setError('Failed to fetch history.');
      console.error('Failed to fetch history:', err);
    }
  };

  const startScanner = () => {
    setError('');
    setSuccess('');
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
      // Check dangerous list and status
      try {
        const [{ data: check }, { data: status }] = await Promise.all([
          checkDangerousForPrescription(data._id),
          getVerificationStatus(data._id)
        ]);
        setDangerousInfo({ flagged: check.flagged || [], status: status?.status || 'none' });
      } catch (_) {
        setDangerousInfo({ flagged: [], status: 'none' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch prescription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispenseMedicine = async () => {
    try {
      setIsProcessing(true);
      // Guard: block dispensing if dangerous and not verified
      const hasFlagged = (dangerousInfo.flagged || []).length > 0;
      const isVerified = dangerousInfo.status === 'verified';
      if (hasFlagged && !isVerified) {
        setError('Dispense blocked: dangerous medication requires doctor verification.');
        return;
      }
      await markPrescriptionAsUsed(scannedPrescription._id);
      setSuccess('Medicine dispensed successfully!');
      setScannedPrescription(null);
      // Refresh history after dispensing
      if (activeTab === 'history') {
        fetchPrescriptionHistory();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dispense medicine');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestVerification = async () => {
    try {
      setIsProcessing(true);
      await requestVerification(scannedPrescription._id, 'Pharmacy request for dangerous medication');
      setDangerousInfo(prev => ({ ...prev, status: 'pending' }));
      setSuccess('Verification requested from doctor.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request verification');
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
        <div className="text-center mb-8"><h1 className="text-4xl font-bold">Pharmacy Dashboard</h1><p>Scan and dispense prescriptions securely</p></div>
        {success && <div className="alert-success mb-6"><AlertDescription><CheckCircle className="w-5 h-5 mr-2" />{success}</AlertDescription></div>}
        {error && <div className="alert-error mb-6"><AlertDescription><AlertTriangle className="w-5 h-5 mr-2" />{error}</AlertDescription></div>}

        <div className="flex justify-center space-x-4 mb-6 border-b">
          <Button variant="ghost" onClick={() => setActiveTab('scan')} className={`pb-3 rounded-none ${activeTab === 'scan' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}><Camera className="w-4 h-4 mr-2" />Scan Prescription</Button>
          <Button variant="ghost" onClick={() => setActiveTab('history')} className={`pb-3 rounded-none ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}><History className="w-4 h-4 mr-2" />Dispensing History</Button>
        </div>

        {activeTab === 'scan' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="card-style">
              <CardHeader><CardTitle><QrCode className="w-6 h-6 inline mr-2" />QR Code Scanner</CardTitle></CardHeader>
              <CardContent className="text-center">
                {!isScanning && !scannedPrescription && <Button onClick={startScanner} className="button-style"><Camera className="w-4 h-4 mr-2" />Start Scanner</Button>}
                {isScanning && <div className="space-y-4"><video ref={videoRef} className="w-full rounded-lg border" autoPlay playsInline /><Button onClick={stopScanner} variant="destructive"><CameraOff className="w-4 h-4 mr-2" />Stop Scanner</Button></div>}
              </CardContent>
            </Card>

            {isProcessing && <p className="text-center">Processing...</p>}

            {scannedPrescription && (
              <Card className="card-style animate-fade-in">
                <CardHeader><CardTitle>Prescription Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p><User className="w-4 h-4 inline mr-2 text-gray-500" /><strong>Patient:</strong> {scannedPrescription.patientId.name || 'N/A'}</p>
                  <p><Calendar className="w-4 h-4 inline mr-2 text-gray-500" /><strong>Expires:</strong> {new Date(scannedPrescription.expiresAt).toLocaleDateString()}</p>
                  <p><Shield className="w-4 h-4 inline mr-2 text-gray-500" /><strong>Usage:</strong> {scannedPrescription.used} / {scannedPrescription.usageLimit}</p>
                  <div><Pill className="w-4 h-4 inline mr-2 text-gray-500" /><strong>Medications:</strong> {scannedPrescription.medications.map(m => m.name).join(', ')}</div>
                  {/* Dangerous drug notice and actions */}
                  {(dangerousInfo.flagged.length > 0) && (
                    <div className="p-3 rounded bg-yellow-50 border border-yellow-200">
                      <p className="text-yellow-800 text-sm font-medium">Potentially dangerous medication detected:</p>
                      <ul className="list-disc list-inside text-sm text-yellow-800">
                        {dangerousInfo.flagged.map(f => (<li key={f.name}>{f.name} — {f.reason}</li>))}
                      </ul>
                      <p className="text-xs text-yellow-700 mt-1">Verification status: {dangerousInfo.status}</p>
                    </div>
                  )}
                  <div className="flex space-x-4 pt-4">
                    <Button onClick={handleDispenseMedicine} disabled={isProcessing || getStatusConfig(scannedPrescription).status !== 'Active' || (dangerousInfo.flagged.length > 0 && dangerousInfo.status !== 'verified')} className="button-style flex-1"><CheckCircle className="w-4 h-4 mr-2" />Dispense</Button>
                    {(dangerousInfo.flagged.length > 0 && dangerousInfo.status !== 'verified') && (
                      <Button onClick={handleRequestVerification} variant="outline" className="flex-1"><Shield className="w-4 h-4 mr-2" />Ask Verification</Button>
                    )}
                    <Button onClick={resetScanner} variant="outline" className="flex-1"><RotateCcw className="w-4 h-4 mr-2" />Scan Another</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <Card className="card-style animate-fade-in">
            <CardHeader><CardTitle><History className="w-6 h-6 inline mr-2" />Your Dispensing History</CardTitle></CardHeader>
            <CardContent>
              {prescriptionHistory.length === 0 ? <p className="text-center text-gray-500 py-8">You have not dispensed any prescriptions yet.</p> : (
                <div className="space-y-4">
                  {prescriptionHistory.map((p) => (
                    <div key={p._id} className="border p-4 rounded-lg bg-gray-50/50 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Prescription #{p._id.slice(-6)}</p>
                        <p className="text-sm text-gray-600"><User className="w-3 h-3 inline mr-1" />Patient: {p.patientId?.name || 'Unknown'}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-sm text-gray-500"><Calendar className="w-3 h-3 inline mr-1" />Dispensed on</p>
                         <p className="text-sm font-medium">{new Date(p.dispensedBy.find(d => d.pharmacistId === "YOUR_LOGGED_IN_USER_ID")?.dispensedAt || p.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
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