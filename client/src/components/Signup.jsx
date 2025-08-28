import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    role: 'patient'
  });
  const [contactMethod, setContactMethod] = useState('email'); // 'email' or 'mobile'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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

    // Validate that the selected contact method is provided
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
      const { data } = await axios.post('http://localhost:5000/api/auth/signup', {
        name: formData.name,
        email: contactMethod === 'email' ? formData.email : null,
        mobile: contactMethod === 'mobile' ? formData.mobile : null,
        password: formData.password,
        role: formData.role
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-secondary flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <Card className="w-full max-w-md glass slide-in-bottom relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4 scale-in">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
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

            {/* Contact Method Selection */}
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
                    className="text-blue-500"
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
                    className="text-blue-500"
                  />
                  <span className="text-sm">Mobile Number</span>
                </label>
              </div>
            </div>

            {/* Conditional Contact Input */}
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
            <span className="text-sm text-gray-600">Already have an account? </span>
            <a href="/login" className="text-sm text-green-500 hover:text-green-600 transition-colors duration-200 hover:underline font-semibold">
              Sign In
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;