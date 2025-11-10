import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser } from '../api/authService';
import { AuthContext } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { AlertDescription } from '../components/ui/alert';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    role: 'patient'
  });
  const [contactMethod, setContactMethod] = useState('email');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (contactMethod === 'email' && !formData.email) {
      setError('Email is required');
      return;
    }
    if (contactMethod === 'mobile' && !formData.mobile) {
      setError('Mobile number is required');
      return;
    }
    
    setIsLoading(true);
    try {
      if (photoDataUrl) {
        // Save temporarily; will be uploaded right after first login
        localStorage.setItem('pendingSignupPhoto', photoDataUrl);
      }
      const res = await signupUser({
        name: formData.name,
        email: contactMethod === 'email' ? formData.email : null,
        mobile: contactMethod === 'mobile' ? formData.mobile : null,
        password: formData.password,
        role: formData.role
      });
      // If patient, log in immediately with returned token and go to survey
      if (formData.role === 'patient' && res?.data?.token) {
        await login(res.data.token);
        navigate('/survey');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      setError('Unable to access camera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoDataUrl(dataUrl);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4 py-12">

      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-teal-700">
            Create Account
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Join us to manage your prescriptions securely
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <Label htmlFor="name" className="form-label">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <Label className="form-label">Contact Method</Label>
              <div className="flex space-x-4 mt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMethod"
                    value="email"
                    checked={contactMethod === 'email'}
                    onChange={(e) => setContactMethod(e.target.value)}
                    className="text-brand-500 focus:ring-brand-200"
                  />
                  <span className="text-sm">Email</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMethod"
                    value="mobile"
                    checked={contactMethod === 'mobile'}
                    onChange={(e) => setContactMethod(e.target.value)}
                    className="text-brand-500 focus:ring-brand-200"
                  />
                  <span className="text-sm">Mobile Number</span>
                </label>
              </div>
            </div>

            {contactMethod === 'email' ? (
              <div className="form-group">
                <Label htmlFor="email" className="form-label">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <Label htmlFor="mobile" className="form-label">Mobile Number</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <Label htmlFor="password" className="form-label">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <Label htmlFor="confirmPassword" className="form-label">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <Label htmlFor="role" className="form-label">Role</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Photo capture (local only) */}
            <div className="space-y-2">
              <Label className="form-label">Your Photo (optional)</Label>
              {!photoDataUrl && !stream && (
                <Button type="button" variant="outline" onClick={startCamera} className="w-full">
                  Open Camera
                </Button>
              )}
              {stream && (
                <div className="space-y-2">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded border border-border" />
                  <div className="flex gap-2">
                    <Button type="button" className="flex-1" onClick={capturePhoto}>Capture</Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={stopCamera}>Cancel</Button>
                  </div>
                </div>
              )}
              {photoDataUrl && (
                <div className="space-y-2">
                  <img src={photoDataUrl} alt="Captured" className="w-40 h-40 object-cover rounded-full border border-border" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => { setPhotoDataUrl(''); startCamera(); }}>Retake</Button>
                    <Button type="button" variant="ghost" onClick={() => setPhotoDataUrl('')}>Remove</Button>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            {error && (
              <div className="alert-error slide-in-top">
                <AlertDescription className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </AlertDescription>
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full button-secondary h-12 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner w-5 h-5 mr-2"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center">
            <span className="text-sm text-slate-600">Already have an account? </span>
            <a href="/login" className="text-sm text-brand-600 hover:text-brand-700 transition-colors duration-200 hover:underline font-semibold">
              Sign In
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;