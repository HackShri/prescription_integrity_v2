import React, { useState, useEffect, useRef } from 'react';
import { QRCode } from 'react-qr-code';
import SignatureCanvas from 'react-signature-canvas';
import { createPrescription, transcribeAudio, smartTranscribeAudio } from '../../api/prescriptionService';
import { usePatientSearch } from '../../utils/patientUtils'; // Import the shared hook
import {
  Mic,
  Plus,
  ArrowLeft,
  Download,
  Phone,
  User,
  Pill,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  PenTool,
  Send,
  Search,
  Loader2
} from 'lucide-react';
import io from 'socket.io-client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { AlertDescription } from '../../components/ui/alert';
import MedicationForm from '../../components/shared/MedicationForm';
import PatientSearch from '../../components/shared/PatientSearch';
import Header from '../../components/layout/Header';

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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [smartMode, setSmartMode] = useState(true); // Enable smart transcription by default
  const sigCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Use the shared patient search hook
  const {
    searchId,
    setSearchId,
    patientData,
    updatePatientData,
    isLoading: isLoadingPatient,
    error: patientError,
    success: patientSuccess
  } = usePatientSearch();

  // Sync patient data with prescription state
  useEffect(() => {
    setPrescription(prev => ({
      ...prev,
      ...patientData
    }));
  }, [patientData]);

  useEffect(() => {
    // Check for OCR data or memory-stored data
    const ocrData = localStorage.getItem('ocrPrescriptionData') || window.ocrPrescriptionData;
    if (ocrData) {
      try {
        const parsedData = typeof ocrData === 'string' ? JSON.parse(ocrData) : ocrData;
        setPrescription(parsedData);
        setIsCreating(true);
        
        // Clear the data after loading
        localStorage.removeItem('ocrPrescriptionData');
        if (window.ocrPrescriptionData) {
          delete window.ocrPrescriptionData;
        }
      } catch (err) {
        console.error('Error parsing OCR data:', err);
      }
    }
  }, []);

  const handleVoiceInput = async () => {
    if (isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        setIsTranscribing(true);
        try {
          let response;
          if (smartMode) {
            // Use smart transcription with prescription generation
            response = await smartTranscribeAudio(
              formData, 
              parseInt(prescription.age) || 25, 
              parseFloat(prescription.weight) || 70.0
            );
          } else {
            // Use regular transcription
            response = await transcribeAudio(formData);
          }
          
          const { data } = response;

          if (data.transcription) {
            // Prefer AI-provided instructions if available; otherwise append transcription
            const aiPrescription = data.prescriptionData || data.prescription || {};
            const aiInstructions = aiPrescription.instructions || '';

            setPrescription((prev) => ({
              ...prev,
              instructions: aiInstructions
                ? (prev.instructions ? `${prev.instructions} ${aiInstructions}` : aiInstructions)
                : (prev.instructions ? `${prev.instructions} ${data.transcription}` : data.transcription)
            }));

            // If smart mode and AI returned medications, auto-populate with full fields
            const aiMeds = (aiPrescription && Array.isArray(aiPrescription.medications)) ? aiPrescription.medications : [];
            if (smartMode && aiMeds.length > 0) {
              const smartMedications = aiMeds.map(med => ({
                name: med.name,
                dosage: med.dosage,
                quantity: typeof med.quantity === 'number' ? med.quantity : parseInt(String(med.quantity).replace(/[^0-9]/g, ''), 10) || '',
                frequency: med.frequency || '',
                timing: med.timing || '',
                duration: med.duration || '',
                instructions: med.instructions || ''
              }));

              setPrescription((prev) => ({
                ...prev,
                medications: [...prev.medications, ...smartMedications]
              }));

              setError('');
              setTimeout(() => {
                setError('');
              }, 100);
            }

            setError('');
          } else {
            setError('No speech detected in recording');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          const errorMessage = err.response?.data?.error || 'Transcription failed. Please try again.';
          setError(errorMessage);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error(err);
      setError('Mic access denied or not supported');
    }
  };

  const handleMedicationsChange = (medications) => {
    setPrescription(prev => ({ ...prev, medications }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrescription(prev => ({ ...prev, [name]: value }));
    
    // If patient email or mobile is changed, also update the search
    if (name === 'patientEmail' || name === 'patientMobile') {
      updatePatientData(name, value);
    }
  };

  const handlePatientIdSearch = (value) => {
    setSearchId(value);
    // Also update the prescription field
    if (value.includes('@')) {
      setPrescription(prev => ({ ...prev, patientEmail: value }));
    } else {
      setPrescription(prev => ({ ...prev, patientMobile: value }));
    }
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
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
      const { data } = await createPrescription(payload);
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
  
  const generateQRValue = (presc) => {
    const shortId = presc._id.slice(-8);
    return `RX:${shortId}`;
  };

  const resetForm = () => {
    setPrescription({
      patientEmail: '', patientMobile: '', instructions: '', medications: [], age: '', weight: '', height: '', usageLimit: 1, expiresAt: '',
    });
    setGeneratedPrescription(null);
    setSignature('');
    setError('');
    setSearchId('');
    if(sigCanvasRef.current) sigCanvasRef.current.clear();
  };

  // Combined error display
  const displayError = error || patientError;
  const displaySuccess = patientSuccess;

  return (
    <div className="min-h-screen gradient-secondary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      <Header />
      <main className="p-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8 slide-in-top">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent mb-2">
            Doctor Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Create and manage digital prescriptions for your patients
          </p>
        </div>

        {displayError && (
          <div className="alert-error slide-in-top mb-6">
            <AlertDescription className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {displayError}
            </AlertDescription>
          </div>
        )}

        {displaySuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg slide-in-top">
            <div className="flex items-center text-green-800">
              <CheckCircle className="w-5 h-5 mr-2" />
              {displaySuccess}
            </div>
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
              <Button onClick={() => setIsCreating(true)} className="w-full button-secondary h-12 text-lg">
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
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Search Section */}
                <PatientSearch 
                  onPatientFound={handlePatientIdSearch}
                  placeholder="Enter patient email or mobile number..."
                  className="p-4"
                  showInstructions={true}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <Label htmlFor="patientEmail">
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
                    <Label htmlFor="patientMobile">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Patient Mobile
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
                    <Label htmlFor="expiresAt">
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
                    <Label htmlFor="usageLimit">
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
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="instructions">
                      <FileText className="w-4 h-4 inline mr-2" />
                      General Instructions
                      {isListening && (
                        <span className="ml-2 text-sm text-red-500 font-medium">
                          🎤 Recording...
                        </span>
                      )}
                      {isTranscribing && (
                        <span className="ml-2 text-sm text-blue-500 font-medium">
                          ⏳ Transcribing...
                        </span>
                      )}
                    </Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="smartMode"
                        checked={smartMode}
                        onChange={(e) => setSmartMode(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="smartMode" className="text-sm">
                        🧠 Smart Mode (Auto-generate prescriptions)
                      </Label>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Input 
                      id="instructions" 
                      name="instructions" 
                      placeholder="Enter instructions or use voice input..." 
                      value={prescription.instructions} 
                      onChange={handleChange} 
                      className="form-input flex-1" 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={handleVoiceInput} 
                      className="w-12 h-12"
                      disabled={isTranscribing}
                      title={isListening ? "Stop recording" : isTranscribing ? "Transcribing..." : "Start voice input"}
                    >
                        {isTranscribing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : isListening ? (
                          <Mic className="h-4 w-4 animate-pulse text-red-500" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                    </Button>
                  </div>
                  {isListening && (
                    <p className="text-sm text-gray-600 mt-1">
                      Click the microphone again to stop recording
                    </p>
                  )}
                </div>

                <MedicationForm 
                  medications={prescription.medications} 
                  onMedicationsChange={handleMedicationsChange} 
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                    <Label htmlFor="age">Age (years)</Label>
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
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input 
                      id="weight" 
                      name="weight" 
                      type="number" 
                      step="0.1"
                      placeholder="Weight" 
                      value={prescription.weight} 
                      onChange={handleChange} 
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input 
                      id="height" 
                      name="height" 
                      type="number" 
                      step="0.1"
                      placeholder="Height" 
                      value={prescription.height} 
                      onChange={handleChange} 
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <Label>
                    <PenTool className="w-4 h-4 inline mr-2" />
                    Digital Signature
                  </Label>
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                    <SignatureCanvas 
                      ref={sigCanvasRef} 
                      canvasProps={{ className: 'w-full h-32 border border-gray-300 rounded' }} 
                      onEnd={handleEndSignature}
                    />
                    <Button type="button" onClick={handleClearSignature} variant="outline" size="sm" className="mt-2">
                      Clear Signature
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full button-secondary h-12 text-lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Prescription...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Generate Prescription
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {generatedPrescription && (
          <Card className="card-style w-full max-w-4xl mx-auto slide-in-bottom">
            <CardHeader className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <CardTitle className="card-header-style">Prescription Generated!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Patient Information</h4>
                      <p><strong>Email:</strong> {generatedPrescription.patientEmail}</p>
                      <p><strong>Mobile:</strong> {generatedPrescription.patientMobile}</p>
                      {generatedPrescription.age && <p><strong>Age:</strong> {generatedPrescription.age} years</p>}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Medications</h4>
                      {generatedPrescription.medications.map((med, index) => (
                        <div key={index} className="mb-2 p-2 bg-white rounded">
                          <p className="font-medium">{med.name} - {med.dosage}</p>
                          {med.frequency && <p className="text-sm text-gray-600">Frequency: {med.frequency}</p>}
                        </div>
                      ))}
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <h4 className="font-medium mb-4">Prescription QR Code</h4>
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <QRCode value={generateQRValue(generatedPrescription)} size={150}/>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      Scan this QR code to verify the prescription
                    </p>
                </div>
              </div>
              <div className="flex space-x-4">
                <Button onClick={resetForm} className="flex-1 button-style">
                  Create Another Prescription
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => window.print()}>
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