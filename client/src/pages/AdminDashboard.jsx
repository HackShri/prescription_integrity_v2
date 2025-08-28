import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import Navbar from '../components/Header';
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
  TrendingUp,
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
        const token = localStorage.getItem('token');
        const { data } = await axios.get('http://localhost:5000/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const doctorsAndShops = data.filter(user => ['doctor', 'shop'].includes(user.role));
        const pending = doctorsAndShops.filter(user => !user.verified);
        const verified = doctorsAndShops.filter(user => user.verified);
        
        setPendingUsers(pending);
        setVerifiedUsers(verified);
        
        // Calculate stats
        setStats({
          totalUsers: data.length,
          pendingCount: pending.length,
          verifiedCount: verified.length,
          doctorsCount: doctorsAndShops.filter(user => user.role === 'doctor').length,
          shopsCount: doctorsAndShops.filter(user => user.role === 'shop').length
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
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/users/verify/${userId}`, { action }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers(pendingUsers.filter(user => user._id !== userId));
      if (action === 'accept') {
        const user = pendingUsers.find(user => user._id === userId);
        setVerifiedUsers([...verifiedUsers, { ...user, verified: true }]);
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
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'doctor':
        return <Activity className="w-4 h-4 text-green-500" />;
      case 'patient':
        return <User className="w-4 h-4 text-purple-500" />;
      case 'pharmacist':
        return <Pill className="w-4 h-4 text-orange-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { color: 'bg-red-100 text-red-800', label: 'Admin' },
      doctor: { color: 'bg-blue-100 text-blue-800', label: 'Doctor' },
      pharmacist: { color: 'bg-green-100 text-green-800', label: 'Pharmacist' },
      patient: { color: 'bg-purple-100 text-purple-800', label: 'Patient' }
    };
    
    const config = roleConfig[role] || roleConfig.patient;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen gradient-accent relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <Navbar />
      
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.1s'}}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-blue-500">{stats.totalUsers}</div>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>

          <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.2s'}}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-warning to-warning-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-warning">{stats.pendingCount}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>

          <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.3s'}}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-success to-success-foreground rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-success">{stats.verifiedCount}</div>
              <p className="text-sm text-muted-foreground">Verified</p>
            </CardContent>
          </Card>

          <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.4s'}}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-green-500">{stats.doctorsCount}</div>
              <p className="text-sm text-muted-foreground">Doctors</p>
            </CardContent>
          </Card>

          <Card className="card-style hover:scale-105 transition-all duration-300 slide-in-bottom" style={{animationDelay: '0.5s'}}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-secondary to-secondary-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-green-500">{stats.shopsCount}</div>
              <p className="text-sm text-muted-foreground">Pharmacies</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pending Users */}
          <Card className="card-style slide-in-bottom" style={{animationDelay: '0.6s'}}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-warning to-warning-foreground rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="card-header-style">Pending Verification</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="loading-spinner w-6 h-6"></div>
                  <span className="ml-3 text-muted-foreground">Loading...</span>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map(user => (
                    <div key={user._id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-white/20 hover:bg-white/70 transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-warning to-warning-foreground rounded-full flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getRoleBadge(user.role)}
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => viewUserDetails(user)}
                        className="hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verified Users */}
          <Card className="card-style slide-in-bottom" style={{animationDelay: '0.7s'}}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-success to-success-foreground rounded-lg flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
                <CardTitle className="card-header-style">Verified Users</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="loading-spinner w-6 h-6"></div>
                  <span className="ml-3 text-muted-foreground">Loading...</span>
                </div>
              ) : verifiedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No verified users</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifiedUsers.map(user => (
                    <div key={user._id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-white/20 hover:bg-white/70 transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-success to-success-foreground rounded-full flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getRoleBadge(user.role)}
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => viewUserDetails(user)}
                        className="hover:bg-blue-100 hover:text-blue-800 transition-colors duration-200"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Details Modal */}
        {selectedUser && (
          <Card className="card-style mt-6 slide-in-bottom">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary-hover rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <CardTitle className="card-header-style">User Details</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedUser(null)}
                  className="hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-hover rounded-full flex items-center justify-center">
                      {getRoleIcon(selectedUser.role)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h3>
                      {getRoleBadge(selectedUser.role)}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">{selectedUser.email}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">
                        Registered: {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {selectedUser.verified ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <Clock className="w-4 h-4 text-warning" />
                      )}
                      <span className={`text-sm ${selectedUser.verified ? 'text-success' : 'text-warning'}`}>
                        Status: {selectedUser.verified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Actions</h4>
                  {!selectedUser.verified && (
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => handleVerify(selectedUser._id, 'accept')}
                        className="button-secondary flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleVerify(selectedUser._id, 'reject')}
                        className="flex-1"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                  
                  {selectedUser.verified && (
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-sm font-medium text-success">User is verified and active</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;