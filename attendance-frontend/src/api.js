// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('🔧 API Base URL:', API_BASE_URL);

// Generic API request handler
const apiRequest = async (endpoint, options = {}) => {
  try {
    console.log(`📡 API Request: ${options.method || 'GET'} ${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ API Error (${response.status}):`, data);
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    console.log(`✅ API Success:`, data);
    return data;
  } catch (error) {
    console.error('❌ API Request failed:', error);
    throw error;
  }
};

// Get all students
export const getStudents = async () => {
  return apiRequest('/students');
};

// Get untrained students
export const getUntrainedStudents = async () => {
  return apiRequest('/students/untrained');
};

// Save face descriptor
export const saveFaceDescriptor = async (studentId, descriptor, photoNumber) => {
  console.log(`💾 Saving face descriptor for ${studentId}, photo #${photoNumber}`);
  
  return apiRequest('/face-descriptors', {
    method: 'POST',
    body: JSON.stringify({
      student_id: studentId,
      descriptor: descriptor,
      photo_number: photoNumber
    }),
  });
};

// Mark student as trained
export const markStudentTrained = async (studentId) => {
  console.log(`✅ Marking student ${studentId} as trained`);
  
  return apiRequest(`/students/${studentId}/trained`, {
    method: 'POST',
  });
};

// Get all face descriptors
export const getAllFaceDescriptors = async () => {
  return apiRequest('/face-descriptors');
};

// Confirm attendance
export const confirmAttendance = async (attendanceData) => {
  console.log('📝 Confirming attendance for:', attendanceData);
  
  return apiRequest('/attendance/confirm', {
    method: 'POST',
    body: JSON.stringify(attendanceData),
  });
};

// Get attendance records
export const getAttendance = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.student_id) queryParams.append('student_id', filters.student_id);
  if (filters.room_id) queryParams.append('room_id', filters.room_id);
  if (filters.date) queryParams.append('date', filters.date);

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/attendance?${queryString}` : '/attendance';
  
  return apiRequest(endpoint);
};

// Health check
export const checkHealth = async () => {
  return apiRequest('/health');
};