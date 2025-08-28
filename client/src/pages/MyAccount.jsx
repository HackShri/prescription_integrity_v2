import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import Navbar from '../components/Header';

const MyAccount = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const { data } = await axios.get('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="p-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">My Account</h2>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Age:</strong> {user.age}</p>
          <p><strong>Weight:</strong> {user.weight} kg</p>
          <p><strong>Height:</strong> {user.height} cm</p>
          {user.photo && (
            <div className="mt-4">
              <p><strong>Profile Photo:</strong></p>
              <img src={user.photo} alt="Profile" className="w-32 h-32 object-cover rounded-full" />
            </div>
          )}
          <Button onClick={() => navigate('/')} className="mt-6">
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MyAccount;