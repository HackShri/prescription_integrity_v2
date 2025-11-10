import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCurrentUser } from '../api/authService';
import { Button } from '../components/ui/button';
import Header from '../components/layout/Header';

const MyAccount = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await fetchCurrentUser();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <Header />
      <main className="p-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-brand-700">My Account</h2>
        <div className="bg-white p-6 rounded-xl border border-border/70 shadow-sm space-y-3 text-slate-700">
          <p><span className="font-semibold text-slate-900">Name:</span> {user.name}</p>
          <p><span className="font-semibold text-slate-900">Email:</span> {user.email}</p>
          <p><span className="font-semibold text-slate-900">Role:</span> {user.role}</p>
          <p><span className="font-semibold text-slate-900">Age:</span> {user.age}</p>
          <p><span className="font-semibold text-slate-900">Weight:</span> {user.weight} kg</p>
          <p><span className="font-semibold text-slate-900">Height:</span> {user.height} cm</p>
          {user.photo && (
            <div className="mt-4">
              <p className="font-semibold text-slate-900 mb-2">Profile Photo:</p>
              <img src={user.photo} alt="Profile" className="w-32 h-32 object-cover rounded-full border border-border/70" />
            </div>
          )}
          <Button onClick={() => navigate('/dashboard')} className="mt-6 button-style">
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MyAccount;