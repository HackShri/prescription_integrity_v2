import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { usePatientSearch } from '../../utils/patientUtils';

const PatientSearch = ({ 
  onPatientFound, 
  placeholder = "Enter patient email or mobile number...",
  className = "",
  showInstructions = true 
}) => {
  const {
    searchId,
    setSearchId,
    isLoading,
    error,
    success
  } = usePatientSearch();

  const handleSearchChange = (value) => {
    setSearchId(value);
    
    // Notify parent component if patient found
    if (onPatientFound) {
      onPatientFound(value);
    }
  };

  return (
    <div className={`bg-blue-50 p-4 rounded-lg border border-blue-200 ${className}`}>
      <div className="flex items-center mb-2">
        <Search className="w-4 h-4 mr-2 text-blue-600" />
        <label className="text-blue-800 font-medium">Quick Patient Search</label>
      </div>
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder={placeholder}
          value={searchId}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isLoading && (
          <div className="flex items-center px-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          </div>
        )}
      </div>
      {showInstructions && (
        <p className="text-sm text-blue-600 mt-1">
          Enter 4+ characters to auto-populate patient details
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600 mt-1">
          {success}
        </p>
      )}
    </div>
  );
};

export default PatientSearch;
