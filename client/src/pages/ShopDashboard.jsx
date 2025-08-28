import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import jsQR from 'jsqr';
import { 
  QrCode, 
  Pill, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  History,
  Camera,
  CameraOff,
  RotateCcw,
  Shield,
  Clock,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import Navbar from '../components/Header';

const ShopDashboard = () => {
  const [scannedPrescription, setScannedPrescription] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prescriptionHistory, setPrescriptionHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' or 'history'
  
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));

  useEffect(() => {
    fetchPrescriptionHistory();
  }, []);

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
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          try {
            // Handle QR code format: RX:shortId
            if (code.data.startsWith('RX:')) {
              const shortId = code.data.substring(3);
              fetchPrescriptionByShortId(shortId);
              setIsScanning(false); // Stop scanning after success
            } else {
              setError('Invalid prescription QR code format. Expected format: RX:shortId');
            }
          } catch (err) {
            setError('Invalid QR code format');
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanQR);
    };

    const delayScanner = setTimeout(() => {
      if (isScanning) {
        startScanner();
      }
    }, 2000);

    return () => {
      clearTimeout(delayScanner);
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning]);

  const fetchPrescriptionHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('http://localhost:5000/api/prescriptions/shop-history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrescriptionHistory(data);
    } catch (err) {
      console.error('Failed to fetch prescription history:', err);
    }
  };

  const startScanner = async () => {
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



  const fetchPrescriptionByShortId = async (shortId) => {
    try {
      setIsProcessing(true);
      console.log('Fetching prescription for short ID:', shortId);
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`http://localhost:5000/api/prescriptions/short/${shortId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Prescription data received:', data);
      setScannedPrescription(data);
      setSuccess('Prescription found! Please verify details below.');
    } catch (err) {
      console.error('Error fetching prescription:', err);
      setError(err.response?.data?.message || 'Failed to fetch prescription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispenseMedicine = async () => {
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/prescriptions/${scannedPrescription._id}/use`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSuccess('Medicine dispensed successfully! Prescription marked as used.');
      setScannedPrescription(null);
      fetchPrescriptionHistory(); // Refresh history
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
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
    setIsScanning(true);
  };

  const getStatusConfig = (prescription) => {
    const isExpired = new Date(prescription.expiresAt) < new Date();
    const isUsedUp = prescription.used >= prescription.usageLimit;
    
    if (isExpired) {
      return { status: 'Expired', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100' };
    } else if (isUsedUp) {
      return { status: 'Used Up', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' };
    } else {
      return { status: 'Active', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-100' };
    }
  };

  return (
    <div className="min-h-screen gradient-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <Navbar />
      <main className="p-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8 slide-in-top">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Pharmacy Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Scan prescriptions and dispense medicines securely
          </p>
        </div>

        {success && (
          <div className="alert-success slide-in-top mb-6">
            <AlertDescription className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </AlertDescription>
          </div>
        )}

        {error && (
          <div className="alert-error slide-in-top mb-6">
            <AlertDescription className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {error}
            </AlertDescription>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6 slide-in-bottom" style={{animationDelay: '0.1s'}}>
          <Button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center space-x-2 ${activeTab === 'scan' ? 'button-style' : 'button-secondary'}`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan Prescription</span>
          </Button>
          <Button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 ${activeTab === 'history' ? 'button-style' : 'button-secondary'}`}
          >
            <History className="w-4 h-4" />
            <span>Dispensing History</span>
          </Button>
        </div>

        {activeTab === 'scan' && (
          <div className="space-y-6">
            {/* Scanner Section */}
            <Card className="card-style slide-in-bottom" style={{animationDelay: '0.2s'}}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="w-6 h-6" />
                  <span>QR Code Scanner</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isScanning && !scannedPrescription && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Scan</h3>
                    <p className="text-muted-foreground mb-4">
                      Click the button below to start scanning prescription QR codes
                    </p>
                    <Button onClick={startScanner} className="button-style">
                      Start Scanner
                    </Button>
                  </div>
                )}

                {isScanning && (
                  <div className="space-y-4">
                    <div className="relative">
                      <video 
                        ref={videoRef} 
                        className="w-full rounded-lg border-2 border-blue-200" 
                        autoPlay 
                        playsInline 
                      />
                      <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                        <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-blue-500"></div>
                        <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-blue-500"></div>
                        <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-blue-500"></div>
                        <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-blue-500"></div>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <Button onClick={stopScanner} className="button-secondary">
                        <CameraOff className="w-4 h-4 mr-2" />
                        Stop Scanner
                      </Button>
                      <Button onClick={resetScanner} className="button-accent">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="text-center py-8">
                    <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Processing prescription...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prescription Details */}
            {scannedPrescription && (
              <Card className="card-style slide-in-bottom" style={{animationDelay: '0.3s'}}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-6 h-6" />
                      <span>Prescription Details</span>
                    </div>
                    <div className={`px-3 py-1 text-xs rounded-full ${getStatusConfig(scannedPrescription).bgColor} ${getStatusConfig(scannedPrescription).color}`}>
                      {getStatusConfig(scannedPrescription).status}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Patient Email:</span>
                      </div>
                      <p className="text-sm text-gray-900 pl-6">{scannedPrescription.patientEmail}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Expiration Date:</span>
                      </div>
                      <p className="text-sm text-gray-900 pl-6">
                        {new Date(scannedPrescription.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                                          <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Pill className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">Medications:</span>
                          </div>
                          <div className="pl-6 space-y-2">
                            {scannedPrescription.medications && scannedPrescription.medications.length > 0 ? (
                              scannedPrescription.medications.map((med, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg border-l-4 border-l-blue-500">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">{med.name}</span>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {med.dosage}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-600">
                                    <span>Quantity: {med.quantity}</span>
                                    {med.frequency && <span>Frequency: {med.frequency}</span>}
                                    {med.timing && <span>Timing: {med.timing}</span>}
                                    {med.duration && <span>Duration: {med.duration}</span>}
                                  </div>
                                  {med.instructions && (
                                    <p className="text-xs text-gray-600 mt-1 italic">
                                      Note: {med.instructions}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 italic">No medications specified</p>
                            )}
                          </div>
                        </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Instructions:</span>
                    </div>
                    <p className="text-sm text-gray-900 pl-6">
                      {scannedPrescription.instructions}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Usage Status:</span>
                    </div>
                    <p className="text-sm text-gray-900 pl-6">
                      {scannedPrescription.used} / {scannedPrescription.usageLimit} times used
                    </p>
                  </div>

                  {scannedPrescription.doctorSignature && (
                    <div className="space-y-2">
                      <span className="font-medium">Doctor Signature:</span>
                      <div className="pl-6">
                        <img
                          src={scannedPrescription.doctorSignature}
                          alt="Doctor Signature"
                          className="h-20 border rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <Button
                      onClick={handleDispenseMedicine}
                      disabled={isProcessing || 
                        scannedPrescription.used >= scannedPrescription.usageLimit ||
                        new Date(scannedPrescription.expiresAt) < new Date()}
                      className="button-style flex-1"
                    >
                      {isProcessing ? 'Processing...' : 'Dispense Medicine'}
                    </Button>
                    <Button
                      onClick={resetScanner}
                      className="button-secondary"
                    >
                      Scan Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <Card className="card-style slide-in-bottom" style={{animationDelay: '0.2s'}}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="w-6 h-6" />
                  <span>Dispensing History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prescriptionHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Yet</h3>
                    <p className="text-muted-foreground">
                      Start scanning prescriptions to see dispensing history here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prescriptionHistory.map((prescription, index) => {
                      const status = getStatusConfig(prescription);
                      const StatusIcon = status.icon;
                      
                      return (
                        <div
                          key={prescription._id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <StatusIcon className={`w-4 h-4 ${status.color}`} />
                              <span className="font-medium">
                                Prescription #{prescription._id.slice(-6)}
                              </span>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${status.bgColor} ${status.color}`}>
                              {status.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div>Patient: {prescription.patientEmail}</div>
                            <div className="space-y-2">
                  <div className="font-medium">Medications:</div>
                  {prescription.medications && prescription.medications.length > 0 ? (
                    prescription.medications.map((med, index) => (
                      <div key={index} className="ml-4 p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium">{med.name} - {med.dosage}</div>
                        <div className="text-xs text-gray-600">
                          Quantity: {med.quantity}
                          {med.frequency && ` | Frequency: ${med.frequency}`}
                          {med.timing && ` | Timing: ${med.timing}`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="ml-4 text-sm text-gray-500 italic">No medications specified</div>
                  )}
                </div>
                            <div>Used: {prescription.used}/{prescription.usageLimit}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopDashboard;