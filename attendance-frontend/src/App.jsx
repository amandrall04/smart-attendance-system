import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { confirmAttendance, getStudents, saveFaceDescriptor, markStudentTrained, getAllFaceDescriptors } from './api';
import './style.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [mode, setMode] = useState('train'); // 'train' or 'recognize'
  
  // Training mode state
  const [untrainedStudents, setUntrainedStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [trainingMessage, setTrainingMessage] = useState('');
  
  // Recognition mode state
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionInterval, setRecognitionInterval] = useState(null);
  const [allDescriptors, setAllDescriptors] = useState([]);
  const [labeledDescriptors, setLabeledDescriptors] = useState(null);
  const [roomId, setRoomId] = useState('ROOM-101');
  const [lastAttendance, setLastAttendance] = useState(null);
  
  const [error, setError] = useState(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log('🔄 Loading face-api.js models...');
        const MODEL_URL = process.env.PUBLIC_URL + '/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        ]);

        console.log('✅ Models loaded successfully');
        setModelsLoaded(true);
      } catch (err) {
        console.error('❌ Error loading models:', err);
        setError('Failed to load models. Ensure models are in /public/models/');
      }
    };

    loadModels();
  }, []);

  // Load untrained students for training mode
  useEffect(() => {
    if (mode === 'train') {
      fetchUntrainedStudents();
    }
  }, [mode]);

  // Load all face descriptors for recognition mode
  useEffect(() => {
    if (mode === 'recognize') {
      loadAllDescriptors();
    }
  }, [mode]);

  const fetchUntrainedStudents = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/students/untrained');
      const data = await response.json();
      setUntrainedStudents(data);
      if (data.length > 0) {
        setSelectedStudent(data[0]);
      }
    } catch (err) {
      console.error('❌ Error fetching untrained students:', err);
      setError('Failed to load untrained students');
    }
  };

  const loadAllDescriptors = async () => {
    try {
      console.log('📥 Loading all face descriptors...');
      const descriptors = await getAllFaceDescriptors();
      setAllDescriptors(descriptors);
      
      // Group descriptors by student
      const groupedByStudent = {};
      descriptors.forEach(desc => {
        const studentId = desc.student_id;
        if (!groupedByStudent[studentId]) {
          groupedByStudent[studentId] = {
            name: desc.students.name,
            id: studentId,
            descriptors: []
          };
        }
        groupedByStudent[studentId].descriptors.push(
          new Float32Array(Object.values(desc.descriptor))
        );
      });

      // Create labeled face descriptors
      const labeled = Object.values(groupedByStudent).map(student => 
        new faceapi.LabeledFaceDescriptors(
          student.name,
          student.descriptors
        )
      );
      
      setLabeledDescriptors(labeled);
      console.log(`✅ Loaded ${labeled.length} trained students`);
    } catch (err) {
      console.error('❌ Error loading descriptors:', err);
      setError('Failed to load face descriptors');
    }
  };

  // Start webcam
  const startVideo = async () => {
    try {
      console.log('📹 Starting webcam...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Webcam started');
          setIsVideoReady(true);
        };
      }
    } catch (err) {
      console.error('❌ Error accessing webcam:', err);
      setError('Failed to access webcam');
      alert('Failed to access webcam. Please grant camera permissions.');
    }
  };

  // Stop webcam
  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsVideoReady(false);
    }
  };

  // TRAINING MODE: Capture face for training
  const captureTrainingPhoto = async () => {
    if (!videoRef.current || !selectedStudent) return;

    try {
      setTrainingMessage('📸 Capturing...');
      
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setTrainingMessage('❌ No face detected. Please position your face clearly.');
        setTimeout(() => setTrainingMessage(''), 3000);
        return;
      }

      // Save descriptor to database
      const descriptorArray = Array.from(detection.descriptor);
      const photoNumber = capturedPhotos.length + 1;
      
      await saveFaceDescriptor(selectedStudent.id, descriptorArray, photoNumber);
      
      setCapturedPhotos([...capturedPhotos, photoNumber]);
      setTrainingMessage(`✅ Photo ${photoNumber}/5 captured!`);
      
      console.log(`✅ Captured photo ${photoNumber} for ${selectedStudent.name}`);

      // If 5 photos captured, mark as trained
      if (photoNumber === 5) {
        await markStudentTrained(selectedStudent.id);
        alert(`✅ Training complete for ${selectedStudent.name}!`);
        setCapturedPhotos([]);
        fetchUntrainedStudents();
        setTrainingMessage('');
      }
    } catch (err) {
      console.error('❌ Error capturing photo:', err);
      setTrainingMessage('❌ Failed to capture photo');
      setTimeout(() => setTrainingMessage(''), 3000);
    }
  };

  // RECOGNITION MODE: Recognize faces
  const recognizeFace = async () => {
    if (!videoRef.current || !canvasRef.current || !labeledDescriptors) return;

    try {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const canvas = canvasRef.current;
      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };

      faceapi.matchDimensions(canvas, displaySize);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length > 0) {
        // Create face matcher
        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // Match each detected face
        const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));
        
        // Draw detections
        results.forEach((result, i) => {
          const box = resizedDetections[i].detection.box;
          const { label, distance } = result;
          
          // Only recognize if match is found (not "unknown")
          if (label !== 'unknown') {
            const confidence = ((1 - distance) * 100).toFixed(2);
            
            // Draw box and label
            const drawBox = new faceapi.draw.DrawBox(box, {
              label: `${label} (${confidence}%)`,
              boxColor: 'green'
            });
            drawBox.draw(canvas);
            
            console.log(`👤 Recognized: ${label} with ${confidence}% confidence`);
            
            // Auto-confirm attendance
            handleRecognizedAttendance(label, confidence);
          } else {
            // Unknown face
            const drawBox = new faceapi.draw.DrawBox(box, {
              label: 'Unknown Person',
              boxColor: 'red'
            });
            drawBox.draw(canvas);
          }
        });
      }
    } catch (err) {
      console.error('❌ Error during recognition:', err);
    }
  };

  // Handle attendance confirmation for recognized face
  const handleRecognizedAttendance = async (studentName, confidence) => {
    try {
      // Find student by name
      const allStudents = await getStudents();
      const student = allStudents.find(s => s.name === studentName);
      
      if (!student) return;

      const result = await confirmAttendance({
        student_id: student.id,
        student_name: student.name,
        room_id: roomId,
        confidence: parseFloat(confidence)
      });

      setLastAttendance(result.attendance);
      alert(`✅ Attendance confirmed for ${studentName}! (${confidence}% match)`);
      stopRecognition();
    } catch (err) {
      if (err.message.includes('already recorded')) {
        console.log('⚠️ Attendance already recorded');
      } else {
        console.error('❌ Error confirming attendance:', err);
      }
    }
  };

  // Start recognition
  const startRecognition = () => {
    if (!labeledDescriptors || labeledDescriptors.length === 0) {
      alert('⚠️ No trained students found. Please train students first!');
      return;
    }

    console.log('🎬 Starting face recognition...');
    setIsRecognizing(true);
    const interval = setInterval(recognizeFace, 1000);
    setRecognitionInterval(interval);
  };

  // Stop recognition
  const stopRecognition = () => {
    if (recognitionInterval) {
      clearInterval(recognitionInterval);
      setRecognitionInterval(null);
      setIsRecognizing(false);
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopRecognition();
      stopVideo();
    };
  }, []);

  return (
    <div className="app">
      <div className="header">
        <h1>🎓 Smart Attendance System</h1>
        <p>AI-Powered Face Recognition Technology</p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* Mode Selector */}
      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'train' ? 'active' : ''}`}
          onClick={() => {
            setMode('train');
            stopRecognition();
          }}
        >
          📸 Training Mode
        </button>
        <button
          className={`mode-btn ${mode === 'recognize' ? 'active' : ''}`}
          onClick={() => {
            setMode('recognize');
            setCapturedPhotos([]);
          }}
        >
          🔍 Recognition Mode
        </button>
      </div>

      <div className="content">
        <div className="video-container">
          <div className="video-wrapper">
            <video ref={videoRef} autoPlay muted playsInline width="640" height="480" />
            <canvas ref={canvasRef} className="canvas-overlay" />
          </div>

          <div className="video-controls">
            <button onClick={startVideo} disabled={isVideoReady} className="btn btn-primary">
              📹 Start Webcam
            </button>
            <button onClick={stopVideo} disabled={!isVideoReady} className="btn btn-secondary">
              ⏹️ Stop Webcam
            </button>
          </div>
        </div>

        <div className="control-panel">
          {/* TRAINING MODE */}
          {mode === 'train' && (
            <>
              <h2>📸 Training Mode</h2>
              <p className="info-text">Capture 5 photos of each student to train the system</p>

              {untrainedStudents.length === 0 ? (
                <div className="success-message">
                  <h3>✅ All students are trained!</h3>
                  <p>Switch to Recognition Mode to start taking attendance.</p>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Select Student to Train:</label>
                    <select
                      value={selectedStudent?.id || ''}
                      onChange={(e) => {
                        const student = untrainedStudents.find(s => s.id === e.target.value);
                        setSelectedStudent(student);
                        setCapturedPhotos([]);
                        setTrainingMessage('');
                      }}
                      className="select-input"
                    >
                      {untrainedStudents.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name} (ID: {student.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="training-progress">
                    <h3>Progress: {capturedPhotos.length}/5 photos</h3>
                    <div className="photo-indicators">
                      {[1, 2, 3, 4, 5].map(num => (
                        <div
                          key={num}
                          className={`photo-indicator ${capturedPhotos.includes(num) ? 'captured' : ''}`}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={captureTrainingPhoto}
                    disabled={!isVideoReady || !modelsLoaded || capturedPhotos.length >= 5}
                    className="btn btn-success btn-large"
                  >
                    📸 Capture Photo
                  </button>

                  {trainingMessage && (
                    <div className={`training-message ${trainingMessage.includes('✅') ? 'success' : 'error'}`}>
                      {trainingMessage}
                    </div>
                  )}

                  <div className="training-instructions">
                    <h4>Instructions:</h4>
                    <ol>
                      <li>Position your face clearly in front of the camera</li>
                      <li>Ensure good lighting</li>
                      <li>Click "Capture Photo" 5 times</li>
                      <li>Slightly change angle/expression between photos</li>
                      <li>System will auto-save after 5 photos</li>
                    </ol>
                  </div>
                </>
              )}
            </>
          )}

          {/* RECOGNITION MODE */}
          {mode === 'recognize' && (
            <>
              <h2>🔍 Recognition Mode</h2>
              <p className="info-text">System will automatically identify trained students</p>

              <div className="form-group">
                <label>Room ID:</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g., ROOM-101"
                  className="text-input"
                  disabled={isRecognizing}
                />
              </div>

              <div className="recognition-stats">
                <p><strong>Trained Students:</strong> {labeledDescriptors?.length || 0}</p>
                <p><strong>Total Face Patterns:</strong> {allDescriptors.length}</p>
              </div>

              <div className="recognition-controls">
                <button
                  onClick={startRecognition}
                  disabled={!modelsLoaded || !isVideoReady || isRecognizing || !labeledDescriptors}
                  className="btn btn-success btn-large"
                >
                  {isRecognizing ? '🟢 Recognizing...' : '▶️ Start Recognition'}
                </button>
                <button
                  onClick={stopRecognition}
                  disabled={!isRecognizing}
                  className="btn btn-warning"
                >
                  ⏸️ Stop Recognition
                </button>
              </div>

              {lastAttendance && (
                <div className="attendance-result">
                  <h3>✅ Last Attendance Confirmed</h3>
                  <p><strong>Student:</strong> {lastAttendance.student_name}</p>
                  <p><strong>Room:</strong> {lastAttendance.room_id}</p>
                  <p><strong>Confidence:</strong> {lastAttendance.confidence}%</p>
                  <p><strong>Time:</strong> {new Date(lastAttendance.timestamp).toLocaleString()}</p>
                </div>
              )}

              <div className="recognition-instructions">
                <h4>How Recognition Works:</h4>
                <ol>
                  <li>Enter the room ID</li>
                  <li>Click "Start Recognition"</li>
                  <li>Position your face in front of camera</li>
                  <li>System will automatically identify you</li>
                  <li>Attendance is recorded automatically</li>
                  <li>Green box = Recognized</li>
                  <li>Red box = Unknown person</li>
                </ol>
              </div>
            </>
          )}

          {/* Status Section */}
          <div className="status-section">
            <h3>System Status</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Models:</span>
                <span className={`status-value ${modelsLoaded ? 'success' : 'pending'}`}>
                  {modelsLoaded ? '✅ Loaded' : '⏳ Loading...'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Webcam:</span>
                <span className={`status-value ${isVideoReady ? 'success' : 'inactive'}`}>
                  {isVideoReady ? '✅ Ready' : '⭕ Not Started'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Mode:</span>
                <span className="status-value active">
                  {mode === 'train' ? '📸 Training' : '🔍 Recognition'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;