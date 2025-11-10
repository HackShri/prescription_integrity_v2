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
      return { status: 'Expired', icon: XCircle, color: 'text-destructive' };
    }
    if (prescription.used >= prescription.usageLimit) {
      return { status: 'Completed', icon: CheckCircle, color: 'text-teal-600' };
    }
    return { status: 'Active', icon: Clock, color: 'text-brand-600' };
  };

  const PillTimelineModal = ({ open, onClose }) => (
    open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl border border-border/70 w-full max-w-lg mx-4 relative">
          <button className="absolute top-3 right-3 text-slate-400 hover:text-destructive" onClick={onClose}><X /></button>
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-center text-brand-700">Pill Timeline</h2>
            <PillTimeline />
          </div>
        </div>
      </div>
    ) : null
  );

  return (
    <div className="min-h-screen bg-brand-50">
      <Header />
      <main className="p-6 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-700 mb-2">
            Patient Dashboard
          </h1>
          <p className="text-slate-600 text-lg">
            Manage your prescriptions and health information
          </p>
        </div>

        {notification && <div className="alert-success mb-6"><AlertDescription>{notification}</AlertDescription></div>}
        {error && <div className="alert-error mb-6"><AlertDescription><AlertTriangle className="w-5 h-5 mr-2" />{error}</AlertDescription></div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-style transition-transform duration-200 hover:-translate-y-1">
            <CardHeader className="text-center"><CardTitle className="text-slate-900">Pill Timeline</CardTitle></CardHeader>
            <CardContent><Button className="w-full button-style" onClick={() => setShowPillModal(true)}>Open Timeline</Button></CardContent>
          </Card>
          <Card className="card-style transition-transform duration-200 hover:-translate-y-1">
            <CardHeader className="text-center"><CardTitle className="text-slate-900">Pharma AI</CardTitle></CardHeader>
            <CardContent><Button asChild className="w-full button-secondary"><Link to="/chatbot">Chat with AI</Link></Button></CardContent>
          </Card>
          <Card className="card-style transition-transform duration-200 hover:-translate-y-1">
            <CardHeader className="text-center"><CardTitle className="text-slate-900">OCR Scanner</CardTitle></CardHeader>
            <CardContent><Button asChild className="w-full button-style"><Link to="/ocr-scanner">Scan Prescription</Link></Button></CardContent>
          </Card>
          <Card className="card-style transition-transform duration-200 hover:-translate-y-1">
            <CardHeader className="text-center"><CardTitle className="text-slate-900">Emergency contact</CardTitle></CardHeader>
            <CardContent><Button asChild className="w-full button-secondary"><Link to="/emergency-contact">Emergency</Link></Button></CardContent>
          </Card>
        </div>

        <PillTimelineModal open={showPillModal} onClose={() => setShowPillModal(false)} />

        {selectedPrescription && (() => {
          const status = getStatusConfig(selectedPrescription);
          const StatusIcon = status.icon;
          return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white border border-border/70 shadow-2xl">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center space-x-2 text-slate-900"><StatusIcon className={`w-5 h-5 ${status.color}`} /><span>Prescription Details</span></CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPrescription(null)} className="text-slate-500 hover:text-destructive"><X className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2 text-slate-900">Medications</h3>
                      {selectedPrescription.medications.map((med, index) => (
                        <div key={index} className="p-3 mb-2 rounded-lg bg-brand-50 border border-brand-100">
                          <p className="font-semibold text-slate-900">{med.name}</p>
                          <p className="text-sm text-slate-600">{med.dosage}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <h3 className="font-semibold text-slate-900">QR Code</h3>
                      <div className="p-3 bg-white border border-border rounded-lg">
                        <QRCode value={generateQRValue(selectedPrescription)} size={150} />
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => handleDownloadPrescription(selectedPrescription._id)} className="button-style w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" />Download PDF
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        <h2 className="text-2xl font-bold text-slate-900 mb-4">My Prescriptions</h2>
        {isLoading ? <p className="text-slate-600">Loading prescriptions...</p> : prescriptions.length === 0 ? (
          <Card className="card-style text-center py-12"><p className="text-slate-500">No Prescriptions Found</p></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.map((prescription) => {
              const status = getStatusConfig(prescription);
              const StatusIcon = status.icon;
              return (
                <Card key={prescription._id} className="card-style transition-transform duration-200 hover:-translate-y-1 cursor-pointer" onClick={() => setSelectedPrescription(prescription)}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center space-x-2 text-sm text-slate-900"><StatusIcon className={`w-4 h-4 ${status.color}`} /><span>RX #{prescription._id.slice(-6)}</span></CardTitle>
                      <span className={`px-2 py-1 text-xs rounded-full ${status.status === 'Active' ? 'bg-brand-100 text-brand-700' : status.status === 'Completed' ? 'bg-teal-100 text-teal-600' : 'bg-rose-100 text-rose-600'}`}>{status.status}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-600">Expires: {new Date(prescription.expiresAt).toLocaleDateString()}</p>
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