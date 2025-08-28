import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { 
  Menu, 
  User, 
  LogOut, 
  Home, 
  LayoutDashboard, 
  Settings, 
  UserCircle,
  MessageCircle,
  QrCode,
  Pill,
  Users
} from 'lucide-react';
import Headroom from 'react-headroom';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const getNavigationItems = () => {
    const baseItems = [
      {
        icon: <Home className="h-5 w-5" />,
        label: 'Home',
        href: '/',
        show: true
      }
    ];
    if (user) {
      baseItems.push(
        {
          icon: <LayoutDashboard className="h-5 w-5" />,
          label: 'Dashboard',
          href: '/dashboard',
          show: true
        },

        {
          icon: <MessageCircle className="h-5 w-5" />,
          label: 'AI Assistant',
          href: '/chatbot',
          show: user.role === 'patient'
        },
        {
          icon: <QrCode className="h-5 w-5" />,
          label: 'QR Scanner',
          href: '/scanner',
          show: true
        },
        {
          icon: <UserCircle className="h-5 w-5" />,
          label: 'My Account',
          href: '/my-account',
          show: true
        }
      );
      if (user.role === 'admin') {
        baseItems.push({
          icon: <Users className="h-5 w-5" />,
          label: 'User Management',
          href: '/admin/users',
          show: true
        });
      }
    }
    return baseItems.filter(item => item.show);
  };

  return (
    <Headroom style={{ position: 'fixed', zIndex: 50, width: '100%' }}>
      <header className="w-full bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="mr-4 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="left" 
                  className="w-[280px] sm:w-[320px] bg-white/95 backdrop-blur-md border-r border-gray-200"
                >
                  <SheetHeader className="pb-6 border-b border-gray-200">
                    <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                      Menu
                    </SheetTitle>
                    {user && (
                      <div className="flex items-center space-x-3 mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name || 'User'}</p>
                          <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                        </div>
                      </div>
                    )}
                  </SheetHeader>
                  
                  <nav className="mt-6">
                    <ul className="space-y-2">
                      {getNavigationItems().map((item, index) => (
                        <li key={index}>
                          <Link 
                            to={item.href}
                            className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200 group"
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="text-gray-500 group-hover:text-blue-500 transition-colors duration-200">
                              {item.icon}
                            </div>
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        </li>
                      ))}
                      
                      {user && (
                        <li className="pt-4 border-t border-gray-200">
                          <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 w-full text-left group"
                          >
                            <LogOut className="h-5 w-5 group-hover:text-red-700 transition-colors duration-200" />
                            <span className="font-medium">Logout</span>
                          </button>
                        </li>
                      )}
                    </ul>
                  </nav>
                </SheetContent>
              </Sheet>
              
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white text-sm font-bold">💊</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  Prescription Integrity
                </h1>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && <NotificationBell />}
              {user ? (
                <>
                  <div className="hidden sm:flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-full">
                    <span className="text-lg">{user.role === 'patient' ? '👤' : user.role === 'doctor' ? '👨‍⚕️' : user.role === 'pharmacist' ? '💊' : '🔧'}</span>
                    <span className="text-sm font-medium capitalize text-gray-700">{user.role}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="button-secondary"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="button-secondary"
                    onClick={() => navigate('/login')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Login</span>
                  </Button>
                  <Button 
                    className="button-style"
                    onClick={() => navigate('/signup')}
                  >
                    <span className="hidden sm:inline">Get Started</span>
                    <span className="sm:hidden">Sign Up</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </Headroom>
  );
};

export default Navbar;