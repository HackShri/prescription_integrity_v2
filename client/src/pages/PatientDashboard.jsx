import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { QRCode } from 'react-qr-code';
import io from 'socket.io-client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import Navbar from '../components/Header';
import PillTimeline from '../components/PillTimeline';
import useSpeechRecognition from '../hooks/useSpeechRecognition.jsx';
import { 
  MessageCircle, 
  QrCode, 
  Mic, 
  MicOff, 
  Clock, 
  Pill, 
  User, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
  XCircle,
  Download,
  FileText
} from 'lucide-react';

const socket = io('http://localhost:5000');

const PatientDashboard = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPillModal, setShowPillModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const {
    transcript,
    listening,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      return;
    }

    const fetchUserAndPrescriptions = async () => {
      try {
        setIsLoading(true);
        // Fetch user data including photo
        const userResponse = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userResponse.data);

        // Fetch prescriptions
        const { data } = await axios.get('http://localhost:5000/api/prescriptions/patient', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPrescriptions(data);
      } catch (err) {
        setError('Failed to fetch data: ' + (err.response?.data?.message || err.message));
      } finally {
        setIsLoading(false);
      }
    };

    const user = JSON.parse(atob(token.split('.')[1]));
    socket.emit('joinRoom', user.userId);

    socket.on('receivePrescription', (prescription) => {
      setNotification('New prescription received!');
      setPrescriptions(prev => [...prev, prescription]);
      setTimeout(() => setNotification(''), 5000);
    });

    fetchUserAndPrescriptions();

    return () => socket.off('receivePrescription');
  }, []);

  const handleVoiceCommand = () => {
    if (!('webkitSpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    setShowVoiceAssistant(true);
    startListening();
  };

  const handleCloseAssistant = () => {
    stopListening();
    setShowVoiceAssistant(false);
  };

  const generateQRValue = (prescription) => {
    const shortId = prescription._id.slice(-8);
    return `RX:${shortId}`;
  };

  const handleDownloadPrescription = async (prescriptionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/prescriptions/${prescriptionId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prescription-${prescriptionId.slice(-6)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setNotification('Prescription downloaded successfully!');
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      setError('Failed to download prescription: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return { status: 'active', icon: Clock, color: 'text-blue-500' };
      case 'completed':
        return { status: 'completed', icon: CheckCircle, color: 'text-green-500' };
      case 'expired':
        return { status: 'expired', icon: XCircle, color: 'text-red-500' };
      default:
        return { status: 'active', icon: Clock, color: 'text-blue-500' };
    }
  };

  const PillTimelineModal = ({ open, onClose }) => (
    open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 relative animate-fade-in">
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <Navbar />
      <main className="p-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8 slide-in-top">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Patient Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your prescriptions and health information
          </p>
        </div>

        {notification && (
          <div className="alert-success slide-in-top mb-6">
            <AlertDescription className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {notification}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.1s'}}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Pill className="w-7 h-7 text-blue-500" />
              </div>
              <CardTitle className="card-header-style">Pill Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full button-style" onClick={() => setShowPillModal(true)}>
                Open Pill Timeline
              </Button>
            </CardContent>
          </Card>

          <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.2s'}}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-blue-500" />
              </div>
              <CardTitle className="card-header-style">Pharma AI</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full button-style">
                <Link to="/chatbot">Chat with Pharma AI</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.3s'}}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-blue-500" />
              </div>
              <CardTitle className="card-header-style">OCR Scanner</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full button-secondary">
                <Link to="/ocr-scanner">Scan Written Prescription</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <PillTimelineModal open={showPillModal} onClose={() => setShowPillModal(false)} />

        {/* Prescription Detail Modal */}
                 {selectedPrescription && (() => {
           const status = getStatusConfig(selectedPrescription.status || (new Date(selectedPrescription.expiresAt) < new Date() ? 'expired' : 'active'));
           const StatusIcon = status.icon;
           
           return (
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <StatusIcon className={`w-5 h-5 ${status.color}`} />
                      <span>Prescription #{selectedPrescription._id.slice(-6)}</span>
                    </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPrescription(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {user?.photo && (
                  <div className="space-y-2">
                    <span className="font-medium">Patient Photo:</span>
                    <div className="pl-6">
                      <img
                        src={user.photo}
                        alt="Patient"
                        className="w-20 h-20 object-cover rounded-full border-2 border-blue-200"
                      />
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Medications</h3>
                      {selectedPrescription.medications && selectedPrescription.medications.length > 0 ? (
                        selectedPrescription.medications.map((med, index) => (
                          <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-l-blue-500">
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
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
                      <p className="text-sm text-gray-700">{selectedPrescription.instructions || 'No specific instructions provided.'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Prescription Details</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Usage:</span> {selectedPrescription.used} / {selectedPrescription.usageLimit} times</p>
                        <p><span className="font-medium">Expires:</span> {new Date(selectedPrescription.expiresAt).toLocaleDateString()}</p>
                        <p><span className="font-medium">Status:</span> 
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            status.status === 'active'
                              ? 'bg-blue-100 text-blue-800'
                              : status.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    {selectedPrescription.doctorSignature && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Doctor Signature</h3>
                        <img
                          src={selectedPrescription.doctorSignature}
                          alt="Doctor Signature"
                          className="h-32 border rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">QR Code</h3>
                      <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-lg shadow-lg">
                          <QRCode
                            value={generateQRValue(selectedPrescription)}
                            size={150}
                            level="M"
                            includeMargin={true}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={() => handleDownloadPrescription(selectedPrescription._id)}
                        className="button-style flex items-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </Button>
                                         </div>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </div>
         );
        })()}

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 slide-in-bottom" style={{animationDelay: '0.5s'}}>
            My Prescriptions
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner w-8 h-8"></div>
              <span className="ml-3 text-muted-foreground">Loading prescriptions...</span>
            </div>
          ) : prescriptions.length === 0 ? (
            <Card className="card-style text-center py-12 slide-in-bottom" style={{animationDelay: '0.6s'}}>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Pill className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prescriptions Found</h3>
              <p className="text-muted-foreground">Your prescriptions will appear here once they are issued by your doctor.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prescriptions.map((prescription, index) => {
                const status = getStatusConfig(prescription.status || (new Date(prescription.expiresAt) < new Date() ? 'expired' : 'active'));
                const StatusIcon = status.icon;

                return (
                  <Card
                    key={prescription._id}
                    className={`card-style hover:scale-105 transition-all duration-300 slide-in-bottom cursor-pointer group ${
                      status.status === 'expired' ? 'border-destructive/50' : ''
                    }`}
                    style={{animationDelay: `${0.6 + index * 0.1}s`}}
                    onClick={() => setSelectedPrescription(prescription)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2 text-sm">
                          <StatusIcon className={`w-4 h-4 ${status.color}`} />
                          <span>RX #{prescription._id.slice(-6)}</span>
                        </CardTitle>
                        <span className={`px-2 py-1 text-xs rounded-full transition-colors duration-200 ${
                          status.status === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : status.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Compact medication preview */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Pill className="w-3 h-3 text-blue-500" />
                          <span className="text-xs font-medium text-gray-600">Medications:</span>
                        </div>
                        <div className="pl-5">
                          {prescription.medications && prescription.medications.length > 0 ? (
                            prescription.medications.slice(0, 2).map((med, idx) => (
                              <div key={idx} className="text-xs text-gray-600 mb-1">
                                • {med.name} - {med.dosage}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 italic">No medications</p>
                          )}
                          {prescription.medications && prescription.medications.length > 2 && (
                            <p className="text-xs text-gray-500">+{prescription.medications.length - 2} more</p>
                          )}
                        </div>
                      </div>

                      {/* Usage info */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Usage: {prescription.used}/{prescription.usageLimit}</span>
                        <span className="text-gray-500">{new Date(prescription.expiresAt).toLocaleDateString()}</span>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-blue-600 bg-opacity-90 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-white text-center">
                          <div className="text-lg font-semibold mb-2">View Details</div>
                          <div className="text-sm opacity-90">Click to see full prescription</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {showVoiceAssistant && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full glass slide-in-bottom">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-accent to-accent-hover rounded-full flex items-center justify-center mb-4">
                  {listening ? (
                    <div className="relative">
                      <Mic className="w-8 h-8 text-white animate-pulse" />
                      <div className="absolute inset-0 w-8 h-8 border-2 border-white rounded-full animate-ping"></div>
                    </div>
                  ) : (
                    <MicOff className="w-8 h-8 text-white" />
                  )}
                </div>
                <CardTitle className="text-xl">Voice Assistant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-sm text-gray-900">
                  {listening ? 'Listening... Speak now!' : 'Tap the button to start speaking'}
                </p>
                {transcript && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-2">You said:</p>
                    <p className="text-sm text-gray-900">{transcript}</p>
                  </div>
                )}
              </CardContent>
              <div className="flex space-x-3 p-6 pt-0">
                <Button
                  onClick={listening ? stopListening : startListening}
                  className={`flex-1 ${listening ? 'button-accent' : 'button-style'}`}
                >
                  {listening ? 'Stop Listening' : 'Start Listening'}
                </Button>
                <Button
                  onClick={handleCloseAssistant}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientDashboard;