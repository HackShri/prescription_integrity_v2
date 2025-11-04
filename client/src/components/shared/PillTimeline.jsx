import React, { useState, useEffect, useRef } from 'react';
import { getPillSchedule, addPillToSchedule, togglePillTakenStatus } from '../../api/prescriptionService';
import { Plus, Check, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const PillTimeline = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddPill, setShowAddPill] = useState(false);
  const [pillName, setPillName] = useState('');
  const [pillTime, setPillTime] = useState('');
  const [pills, setPills] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [notification, setNotification] = useState('');
  const modalRef = useRef(null);

  socket.on('connect', () => console.log(' socket connected:', socket.id));
  socket.on('disconnect', () => console.warn('socket disconnected'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const fetchSchedule = async () => {
      try {
        const { data } = await getPillSchedule();
        setPills(data.schedule.filter(p => p.date === selectedDate));
      } catch (error) {
        console.error('Error fetching schedule:', error);
      }
    };
    fetchSchedule();

    const user = JSON.parse(atob(token.split('.')[1]));
    socket.emit('joinRoom', user.userId);
    socket.on('pillNotification', (data) => {
      setNotification(data.message);
      const audio = new Audio('/sounds/alarm.wav');
      audio.play().catch(() => console.warn('Autoplay blocked'));
      setTimeout(() => setNotification(''), 5000);
    });

    return () => {
      socket.off('pillNotification');
    };
  }, [selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowAddPill(false);
        setPillName('');
        setPillTime('');
      }
    };

    if (showAddPill) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddPill]);

  const addPill = async () => {
    if (!pillName || !pillTime) return;
    try {
      const { data } = await addPillToSchedule({ date: selectedDate, name: pillName, time: pillTime });
      setPills(data.schedule.filter(p => p.date === selectedDate));
      setPillName('');
      setPillTime('');
      setShowAddPill(false);
      setSuccessMessage(`${pillName} scheduled for ${pillTime}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding pill:', error);
    }
  };

  const togglePillTaken = async (pillId) => {
    try {
      const { data } = await togglePillTakenStatus(pillId);
      setPills(data.schedule.filter(p => p.date === selectedDate));
    } catch (error) {
      console.error('Error toggling pill:', error);
    }
  };

  return (
    <div className="p-2">
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}
      {notification && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
          {notification}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">Pill Schedule</h3>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <Button onClick={() => setShowAddPill(true)} size="icon" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {pills.length === 0 ? (
        <p className="text-center text-gray-500">No pills scheduled</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {pills.map(pill => (
            <Card key={pill._id} className="rounded-xl shadow-md p-0 flex flex-col items-center justify-center h-32 w-full">
              <CardContent className="flex flex-col items-center justify-center p-2 h-full w-full">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-700 font-semibold">{pill.time}</span>
                </div>
                <h4 className="font-medium text-center text-base mb-2 truncate w-full">{pill.name}</h4>
                <Button
                  onClick={() => togglePillTaken(pill._id)}
                  size="icon"
                  className={pill.taken ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {showAddPill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card ref={modalRef} className="max-w-sm w-full bg-white shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-gray-900">Add New Pill</CardTitle>
              <p className="text-sm text-gray-600">Schedule a medication for {new Date(selectedDate).toLocaleDateString()}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Medicine Name</label>
                <Input
                  value={pillName}
                  onChange={(e) => setPillName(e.target.value)}
                  placeholder="Enter medicine name"
                  className="w-full"
                  onKeyPress={(e) => e.key === 'Enter' && addPill()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Time to Take</label>
                <Input
                  type="time"
                  value={pillTime}
                  onChange={(e) => setPillTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </CardContent>
            <div className="flex space-x-3 p-4 pt-0">
              <Button
                onClick={addPill}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!pillName || !pillTime}
              >
                Save Pill
              </Button>
              <Button
                onClick={() => {
                  setShowAddPill(false);
                  setPillName('');
                  setPillTime('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PillTimeline;