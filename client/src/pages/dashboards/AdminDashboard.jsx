import React, { useState, useEffect } from 'react';
import { getAllUsers, verifyUser } from '../../api/prescriptionService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AlertDescription } from '../../components/ui/alert';
import Header from '../../components/layout/Header';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Mail, 
  Calendar,
  Shield,
  Activity,
  User,
  Pill
} from 'lucide-react';

const AdminDashboard = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingCount: 0,
    verifiedCount: 0,
    doctorsCount: 0,
    shopsCount: 0
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const { data } = await getAllUsers();
        const doctorsAndShops = data.filter(user => ['doctor', 'pharmacist'].includes(user.role));
        const pending = doctorsAndShops.filter(user => !user.verified);
        const verified = doctorsAndShops.filter(user => user.verified);
        
        setPendingUsers(pending);
        setVerifiedUsers(verified);
        
        setStats({
          totalUsers: data.length,
          pendingCount: pending.length,
          verifiedCount: verified.length,
          doctorsCount: doctorsAndShops.filter(user => user.role === 'doctor').length,
          shopsCount: doctorsAndShops.filter(user => user.role === 'pharmacist').length
        });
      } catch (err) {
        setError('Failed to fetch users');
        console.error('Error fetching users:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleVerify = async (userId, action) => {
    try {
      await verifyUser(userId, action);
      const userToMove = pendingUsers.find(user => user._id === userId);
      setPendingUsers(pendingUsers.filter(user => user._id !== userId));
      
      if (action === 'accept' && userToMove) {
        setVerifiedUsers([...verifiedUsers, { ...userToMove, verified: true }]);
        setStats(prev => ({
          ...prev,
          pendingCount: prev.pendingCount - 1,
          verifiedCount: prev.verifiedCount + 1
        }));
      } else {
        setStats(prev => ({
          ...prev,
          pendingCount: prev.pendingCount - 1
        }));
      }
      setSelectedUser(null);
    } catch (err) {
      setError('Failed to process verification');
    }
  };

  const viewUserDetails = (user) => {
    setSelectedUser(user);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-white" />;
      case 'doctor': return <Activity className="w-4 h-4 text-white" />;
      case 'patient': return <User className="w-4 h-4 text-white" />;
      case 'pharmacist': return <Pill className="w-4 h-4 text-white" />;
      default: return <User className="w-4 h-4 text-white" />;
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { color: 'bg-red-100 text-red-800', label: 'Admin' },
      doctor: { color: 'bg-blue-100 text-blue-800', label: 'Doctor' },
      pharmacist: { color: 'bg-green-100 text-green-800', label: 'Pharmacist' },
      patient: { color: 'bg-purple-100 text-purple-800', label: 'Patient' }
    };
    const config = roleConfig[role] || { color: 'bg-gray-100 text-gray-800', label: 'User' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen gradient-accent relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      <Header />
      <main className="p-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-8 slide-in-top">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage user verifications and system administration
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-hover rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-blue-500">{stats.totalUsers}</div>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </CardContent>
            </Card>
            <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.1s'}}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-yellow-500">{stats.pendingCount}</div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.2s'}}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-green-500">{stats.verifiedCount}</div>
                <p className="text-sm text-muted-foreground">Verified</p>
              </CardContent>
            </Card>
            <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.3s'}}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-blue-500">{stats.doctorsCount}</div>
                <p className="text-sm text-muted-foreground">Doctors</p>
              </CardContent>
            </Card>
            <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.4s'}}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Pill className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-teal-500">{stats.shopsCount}</div>
                <p className="text-sm text-muted-foreground">Pharmacies</p>
              </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="card-style slide-in-bottom" style={{animationDelay: '0.5s'}}>
            <CardHeader>
              <CardTitle className="card-header-style">Pending Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <p>Loading...</p> : pendingUsers.length === 0 ? <p>No pending requests</p> : (
                <div className="space-y-4">
                  {pendingUsers.map(user => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {getRoleBadge(user.role)}
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => viewUserDetails(user)}>
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-style slide-in-bottom" style={{animationDelay: '0.6s'}}>
            <CardHeader>
              <CardTitle className="card-header-style">Verified Users</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <p>Loading...</p> : verifiedUsers.length === 0 ? <p>No verified users</p> : (
                <div className="space-y-4">
                  {verifiedUsers.map(user => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                         <div className="flex items-center space-x-2 mt-1">
                          {getRoleBadge(user.role)}
                        </div>
                      </div>
                       <Button variant="outline" onClick={() => viewUserDetails(user)}>
                        <Eye className="w-4 h-4 mr-2" /> View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedUser && (
          <Card className="card-style mt-6 slide-in-bottom">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="card-header-style">User Details</CardTitle>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  <UserX className="w-4 h-4 mr-2" /> Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-hover rounded-full flex items-center justify-center">
                      {getRoleIcon(selectedUser.role)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h3>
                      {getRoleBadge(selectedUser.role)}
                    </div>
                  </div>
              <p><Mail className="w-4 h-4 inline mr-2"/>Email: {selectedUser.email}</p>
              <p><Calendar className="w-4 h-4 inline mr-2"/>Registered: {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              <p>Status: {selectedUser.verified ? <span className="text-green-600">Verified <CheckCircle className="w-4 h-4 inline"/></span> : <span className="text-yellow-600">Pending <Clock className="w-4 h-4 inline"/></span>}</p>
              {!selectedUser.verified && (
                <div className="flex space-x-3 pt-4">
                  <Button onClick={() => handleVerify(selectedUser._id, 'accept')} className="button-secondary flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" /> Accept
                  </Button>
                  <Button variant="destructive" onClick={() => handleVerify(selectedUser._id, 'reject')} className="flex-1">
                    <UserX className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;