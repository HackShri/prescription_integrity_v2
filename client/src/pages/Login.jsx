import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { loginUser } from '../api/authService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { AlertDescription } from '../components/ui/alert';

const Login = () => {
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { data } = await loginUser({ 
        emailOrMobile, 
        password 
      });
      login(data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md glass">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-brand-700">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <Label htmlFor="emailOrMobile" className="form-label">Email or Mobile Number</Label>
              <Input
                id="emailOrMobile"
                type="text"
                placeholder="Enter your email or mobile number"
                value={emailOrMobile}
                onChange={(e) => setEmailOrMobile(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <Label htmlFor="password" className="form-label">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
              />
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
              className="w-full button-style h-12 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner w-5 h-5 mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center">
            <a href="/forgot-password" className="text-sm text-brand-600 hover:text-brand-700 transition-colors duration-200 hover:underline">
              Forgot your password?
            </a>
          </div>
          <div className="text-center">
            <span className="text-sm text-slate-600">Don't have an account? </span>
            <a href="/signup" className="text-sm text-brand-600 hover:text-brand-700 transition-colors duration-200 hover:underline font-semibold">
              Sign Up
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;