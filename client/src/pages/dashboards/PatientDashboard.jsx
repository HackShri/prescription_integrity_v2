import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchCurrentUser } from '../../api/authService';
import { getPatientPrescriptions, downloadPrescriptionPdf } from '../../api/prescriptionService';
import { QRCode } from 'react-qr-code';
import io from 'socket.io-client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import Header from '../../components/layout/Header';
import PillTimeline from '../../components/shared/PillTimeline';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import { 
  MessageCircle, 
  FileText, 
  Clock, 
  Pill, 
  AlertTriangle,
  CheckCircle,
  X,
  XCircle,
  Download
} from 'lucide-react';

const socket = io('http://localhost:5000');

const PatientDashboard = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPillModal, setShowPillModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const { transcript, listening, startListening, stopListening } = useSpeechRecognition();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      setIsLoading(false);
      return;
    }

    const fetchUserAndPrescriptions = async () => {
      try {
        setIsLoading(true);
        const userResponse = await fetchCurrentUser();
        setUser(userResponse.data);

        const { data } = await getPatientPrescriptions();
        setPrescriptions(data);
      } catch (err) {
        setError('Failed to fetch data: ' + (err.response?.data?.message || err.message));
      } finally {
        setIsLoading(false);
      }
    };

    const decodedUser = JSON.parse(atob(token.split('.')[1]));
    socket.emit('joinRoom', decodedUser.userId);
    socket.on('receivePrescription', (prescription) => {
      setNotification('New prescription received!');
      setPrescriptions(prev => [...prev, prescription]);
      setTimeout(() => setNotification(''), 5000);
    });

    fetchUserAndPrescriptions();

    return () => socket.off('receivePrescription');
  }, []);

  const generateQRValue = (prescription) => {
    const shortId = prescription._id.slice(-8);
    return `RX:${shortId}`;
  };

  const handleDownloadPrescription = async (prescriptionId) => {
    try {
      const response = await downloadPrescriptionPdf(prescriptionId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prescription-${prescriptionId.slice(-6)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download prescription: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStatusConfig = (prescription) => {
    if (new Date(prescription.expiresAt) < new Date()) {
        return { status: 'Expired', icon: XCircle, color: 'text-red-500' };
    }
    if (prescription.used >= prescription.usageLimit) {
        return { status: 'Completed', icon: CheckCircle, color: 'text-green-500' };
    }
    return { status: 'Active', icon: Clock, color: 'text-blue-500' };
  };

  const PillTimelineModal = ({ open, onClose }) => (
    open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 relative animate-fade-in">
          <button className="absolute top-3 right-3 text-gray-400 hover:text-red-500" onClick={onClose}><X /></button>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Pill Timeline</h2>
            <PillTimeline />
          </div>
        </div>
      </div>
    ) : null
  );

  return (
    <div className="min-h-screen gradient-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      <Header />
      <main className="p-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8 slide-in-top">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Patient Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your prescriptions and health information
          </p>
        </div>

        {notification && <div className="alert-success mb-6"><AlertDescription>{notification}</AlertDescription></div>}
        {error && <div className="alert-error mb-6"><AlertDescription><AlertTriangle className="w-5 h-5 mr-2" />{error}</AlertDescription></div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-style hover:scale-105 transition-all duration-300">
            <CardHeader className="text-center"><CardTitle>Pill Timeline</CardTitle></CardHeader>
            <CardContent><Button className="w-full" onClick={() => setShowPillModal(true)}>Open Timeline</Button></CardContent>
          </Card>
          <Card className="card-style hover:scale-105 transition-all duration-300">
            <CardHeader className="text-center"><CardTitle>Pharma AI</CardTitle></CardHeader>
            <CardContent><Button asChild className="w-full"><Link to="/chatbot">Chat with AI</Link></Button></CardContent>
          </Card>
          <Card className="card-style hover:scale-105 transition-all duration-300">
            <CardHeader className="text-center"><CardTitle>OCR Scanner</CardTitle></CardHeader>
            <CardContent><Button asChild className="w-full button-secondary"><Link to="/ocr-scanner">Scan Prescription</Link></Button></CardContent>
          </Card>
        </div>

        <PillTimelineModal open={showPillModal} onClose={() => setShowPillModal(false)} />

        {selectedPrescription && (() => {
           const status = getStatusConfig(selectedPrescription);
           const StatusIcon = status.icon;
           return (
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center space-x-2"><StatusIcon className={`w-5 h-5 ${status.color}`} /><span>Prescription Details</span></CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPrescription(null)}><X className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Medications</h3>
                      {selectedPrescription.medications.map((med, index) => <div key={index}><p>{med.name} - {med.dosage}</p></div>)}
                    </div>
                    <div className="flex flex-col items-center">
                      <h3 className="font-semibold mb-2">QR Code</h3>
                      <QRCode value={generateQRValue(selectedPrescription)} size={150}/>
                    </div>
                  </div>
                  <Button onClick={() => handleDownloadPrescription(selectedPrescription._id)}><Download className="w-4 h-4 mr-2" />Download PDF</Button>
                </CardContent>
               </Card>
             </div>
           );
        })()}

        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Prescriptions</h2>
        {isLoading ? <p>Loading prescriptions...</p> : prescriptions.length === 0 ? (
          <Card className="card-style text-center py-12"><p>No Prescriptions Found</p></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.map((prescription) => {
              const status = getStatusConfig(prescription);
              const StatusIcon = status.icon;
              return (
                <Card key={prescription._id} className="card-style hover:scale-105 cursor-pointer" onClick={() => setSelectedPrescription(prescription)}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center space-x-2 text-sm"><StatusIcon className={`w-4 h-4 ${status.color}`} /><span>RX #{prescription._id.slice(-6)}</span></CardTitle>
                      <span className={`px-2 py-1 text-xs rounded-full ${status.status === 'Active' ? 'bg-blue-100 text-blue-800' : status.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{status.status}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600">Expires: {new Date(prescription.expiresAt).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientDashboard;