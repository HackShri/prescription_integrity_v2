import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCode } from 'react-qr-code';
import SignatureCanvas from 'react-signature-canvas';
import { 
  Mic, 
  MicOff, 
  Plus, 
  X, 
  User, 
  Pill, 
  FileText, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  PenTool,
  Send,
  ArrowLeft,
  Download,
  Phone
} from 'lucide-react';
import io from 'socket.io-client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import MedicationForm from '../components/MedicationForm';
import Navbar from '../components/Header';

const socket = io('http://localhost:5000');

const DoctorDashboard = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [prescription, setPrescription] = useState({
    patientEmail: '',
    patientMobile: '',
    instructions: '',
    medications: [],
    age: '',
    weight: '',
    height: '',
    usageLimit: 1,
    expiresAt: '',
  });
  const [generatedPrescription, setGeneratedPrescription] = useState(null);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recognitionRef = useRef(null);
  const sigCanvasRef = useRef(null);

  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrescription(prev => ({ ...prev, instructions: transcript }));
        setIsListening(false);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }

    // Check for OCR data from scanner
    const ocrData = localStorage.getItem('ocrPrescriptionData');
    if (ocrData) {
      try {
        const parsedData = JSON.parse(ocrData);
        setPrescription(parsedData);
        setIsCreating(true);
        localStorage.removeItem('ocrPrescriptionData'); // Clear the data
      } catch (err) {
        console.error('Error parsing OCR data:', err);
      }
    }
  }, []);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      setError('Voice input not supported in this browser');
      return;
    }
    setIsListening(true);
    recognitionRef.current.start();
  };

  const handleMedicationsChange = (medications) => {
    setPrescription(prev => ({ ...prev, medications }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrescription(prev => ({ ...prev, [name]: value }));
  };

  const handleClearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setSignature('');
    }
  };

  const handleEndSignature = () => {
    if (sigCanvasRef.current) {
      setSignature(sigCanvasRef.current.toDataURL());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    if (!signature) {
      setError('Please provide a digital signature');
      setIsSubmitting(false);
      return;
    }

    if (prescription.medications.length === 0) {
      setError('Please add at least one medication');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(atob(token.split('.')[1]));
      const payload = {
        ...prescription,
        age: parseInt(prescription.age) || 0,
        weight: parseFloat(prescription.weight) || 0,
        height: parseFloat(prescription.height) || 0,
        usageLimit: parseInt(prescription.usageLimit) || 1,
        doctorId: user.userId,
        doctorSignature: signature,
      };
      const { data } = await axios.post('http://localhost:5000/api/prescriptions', payload, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      socket.emit('sendPrescription', {
        patientId: data.patientId,
        prescription: { ...payload, _id: data._id },
      });
      setGeneratedPrescription({ ...payload, _id: data._id });
      setIsCreating(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateQRValue = (prescription) => {
    const shortId = prescription._id.slice(-8);
    return `RX:${shortId}`;
  };

  const resetForm = () => {
    setPrescription({
      patientEmail: '',
      patientMobile: '',
      instructions: '',
      medications: [],
      age: '',
      weight: '',
      height: '',
      usageLimit: 1,
      expiresAt: '',
    });
    setGeneratedPrescription(null);
    setSignature('');
    setError('');
  };

  return (
    <div className="min-h-screen gradient-secondary relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <Navbar />
      
      <main className="p-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8 slide-in-top">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent mb-2">
            Doctor Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Create and manage digital prescriptions for your patients
          </p>
        </div>

        {error && (
          <div className="alert-error slide-in-top mb-6">
            <AlertDescription className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {error}
            </AlertDescription>
          </div>
        )}

        {!isCreating && !generatedPrescription && (
          <Card className="card-style w-full max-w-2xl mx-auto slide-in-bottom">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-secondary to-primary rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="card-header-style">Create Prescription</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsCreating(true)} 
                className="w-full button-secondary h-12 text-lg"
              >
                Start New Prescription
              </Button>
            </CardContent>
          </Card>
        )}

        {isCreating && (
          <Card className="card-style w-full max-w-4xl mx-auto slide-in-bottom">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="card-header-style">New Prescription</CardTitle>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <Label htmlFor="patientEmail" className="form-label">
                      <User className="w-4 h-4 inline mr-2" />
                      Patient Email
                    </Label>
                    <Input
                      id="patientEmail"
                      name="patientEmail"
                      type="email"
                      placeholder="patient@example.com"
                      value={prescription.patientEmail}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="patientMobile" className="form-label">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Patient Mobile Number
                    </Label>
                    <Input
                      id="patientMobile"
                      name="patientMobile"
                      type="tel"
                      placeholder="+1234567890"
                      value={prescription.patientMobile}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <Label htmlFor="expiresAt" className="form-label">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Expiration Date
                    </Label>
                    <Input
                      id="expiresAt"
                      name="expiresAt"
                      type="date"
                      value={prescription.expiresAt}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <Label htmlFor="usageLimit" className="form-label">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Usage Limit
                    </Label>
                    <Input
                      id="usageLimit"
                      name="usageLimit"
                      type="number"
                      placeholder="1"
                      value={prescription.usageLimit}
                      onChange={handleChange}
                      className="form-input"
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Label htmlFor="instructions" className="form-label">
                    <FileText className="w-4 h-4 inline mr-2" />
                    General Instructions
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="instructions"
                      name="instructions"
                      placeholder="Enter general prescription instructions..."
                      value={prescription.instructions}
                      onChange={handleChange}
                      className="form-input flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleVoiceInput}
                      disabled={isListening}
                      className="w-12 h-12"
                    >
                      {isListening ? (
                        <div className="relative">
                          <Mic className="h-4 w-4 animate-pulse" />
                          <div className="absolute inset-0 w-4 h-4 border-2 border-primary rounded-full animate-ping"></div>
                        </div>
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <MedicationForm 
                  medications={prescription.medications}
                  onMedicationsChange={handleMedicationsChange}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <Label htmlFor="age" className="form-label">Age</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      placeholder="Age"
                      value={prescription.age}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="weight" className="form-label">Weight (kg)</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      placeholder="Weight"
                      value={prescription.weight}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="height" className="form-label">Height (cm)</Label>
                    <Input
                      id="height"
                      name="height"
                      type="number"
                      placeholder="Height"
                      value={prescription.height}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Label className="form-label">
                    <PenTool className="w-4 h-4 inline mr-2" />
                    Digital Signature
                  </Label>
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                    <SignatureCanvas
                      ref={sigCanvasRef}
                      canvasProps={{
                        className: 'w-full h-32 border border-gray-300 rounded'
                      }}
                      onEnd={handleEndSignature}
                    />
                    <div className="flex space-x-2 mt-2">
                      <Button
                        type="button"
                        onClick={handleClearSignature}
                        variant="outline"
                        size="sm"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full button-secondary h-12 text-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="loading-spinner w-5 h-5 mr-2"></div>
                      Creating Prescription...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Send className="w-5 h-5 mr-2" />
                      Generate Prescription
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {generatedPrescription && (
          <Card className="card-style w-full max-w-4xl mx-auto slide-in-bottom">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-success to-success-foreground rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="card-header-style">Prescription Generated Successfully!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Patient Information</h3>
                    <p className="text-sm text-muted-foreground">Email: {generatedPrescription.patientEmail}</p>
                    {generatedPrescription.patientMobile && (
                      <p className="text-sm text-muted-foreground">Mobile: {generatedPrescription.patientMobile}</p>
                    )}
                    <p className="text-sm text-muted-foreground">Age: {generatedPrescription.age}</p>
                    <p className="text-sm text-muted-foreground">Weight: {generatedPrescription.weight} kg</p>
                    <p className="text-sm text-muted-foreground">Height: {generatedPrescription.height} cm</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Prescription Details</h3>
                    <p className="text-sm text-muted-foreground">Instructions: {generatedPrescription.instructions}</p>
                    <p className="text-sm text-muted-foreground">Usage Limit: {generatedPrescription.usageLimit}</p>
                    <p className="text-sm text-muted-foreground">Expires: {new Date(generatedPrescription.expiresAt).toLocaleDateString()}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Medications</h3>
                    {generatedPrescription.medications.map((med, index) => (
                      <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-sm">{med.name} - {med.dosage}</p>
                        <p className="text-xs text-gray-600">Quantity: {med.quantity}</p>
                        {med.frequency && <p className="text-xs text-gray-600">Frequency: {med.frequency}</p>}
                        {med.timing && <p className="text-xs text-gray-600">Timing: {med.timing}</p>}
                        {med.duration && <p className="text-xs text-gray-600">Duration: {med.duration}</p>}
                        {med.instructions && <p className="text-xs text-gray-600">Instructions: {med.instructions}</p>}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Doctor Signature</h3>
                    <img 
                      src={generatedPrescription.doctorSignature} 
                      alt="Doctor Signature" 
                      className="h-32 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">QR Code</h3>
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-lg shadow-lg">
                        <QRCode
                          value={generateQRValue(generatedPrescription)}
                          size={150}
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Button 
                  onClick={resetForm} 
                  className="flex-1 button-style"
                >
                  Create Another Prescription
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.print()}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Print Prescription
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;