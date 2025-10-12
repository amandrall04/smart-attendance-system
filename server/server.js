require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase client initialized');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    console.log('📋 Fetching all students...');
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching students:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Successfully fetched ${data.length} students`);
    res.json(data);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get untrained students (for training module)
app.get('/api/students/untrained', async (req, res) => {
  try {
    console.log('📋 Fetching untrained students...');
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('is_trained', false)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching untrained students:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Found ${data.length} untrained students`);
    res.json(data);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save face descriptor for a student
app.post('/api/face-descriptors', async (req, res) => {
  try {
    const { student_id, descriptor, photo_number } = req.body;

    console.log(`💾 Saving face descriptor for student ${student_id}, photo #${photo_number}`);

    if (!student_id || !descriptor || !photo_number) {
      return res.status(400).json({ 
        error: 'Missing required fields: student_id, descriptor, photo_number' 
      });
    }

    // Insert face descriptor
    const { data: descriptorData, error: descriptorError } = await supabase
      .from('face_descriptors')
      .insert([{ student_id, descriptor, photo_number }])
      .select();

    if (descriptorError) {
      console.error('❌ Error saving descriptor:', descriptorError);
      return res.status(500).json({ error: descriptorError.message });
    }

    console.log(`✅ Face descriptor saved for ${student_id}`);
    res.status(201).json({
      message: 'Face descriptor saved',
      descriptor: descriptorData[0]
    });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark student as trained
app.post('/api/students/:id/trained', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`✅ Marking student ${id} as trained`);

    const { data, error } = await supabase
      .from('students')
      .update({ is_trained: true })
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Error updating student:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Student ${id} marked as trained`);
    res.json({ message: 'Student marked as trained', student: data[0] });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all face descriptors
app.get('/api/face-descriptors', async (req, res) => {
  try {
    console.log('📋 Fetching all face descriptors...');
    
    const { data, error } = await supabase
      .from('face_descriptors')
      .select(`
        *,
        students (id, name, email)
      `);

    if (error) {
      console.error('❌ Error fetching descriptors:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Fetched ${data.length} face descriptors`);
    res.json(data);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm attendance (with confidence score)
app.post('/api/attendance/confirm', async (req, res) => {
  try {
    const { student_id, student_name, room_id, confidence } = req.body;

    console.log('📝 Attendance confirmation request:', {
      student_id,
      student_name,
      room_id,
      confidence: confidence ? `${confidence}%` : 'N/A'
    });

    if (!student_id || !student_name || !room_id) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: student_id, student_name, room_id' 
      });
    }

    // Check for duplicate attendance (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentAttendance, error: checkError } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student_id)
      .eq('room_id', room_id)
      .gte('timestamp', fiveMinutesAgo)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking recent attendance:', checkError);
    } else if (recentAttendance && recentAttendance.length > 0) {
      console.log('⚠️ Duplicate attendance detected (within 5 minutes)');
      return res.status(409).json({ 
        error: 'Attendance already recorded recently',
        lastAttendance: recentAttendance[0]
      });
    }

    // Insert attendance record
    const { data, error } = await supabase
      .from('attendance')
      .insert([{
        student_id,
        student_name,
        room_id,
        confidence: confidence || null,
        timestamp: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Error inserting attendance:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Attendance confirmed successfully:', data[0]);
    res.status(201).json({
      message: 'Attendance confirmed successfully',
      attendance: data[0]
    });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance records
app.get('/api/attendance', async (req, res) => {
  try {
    const { student_id, room_id, date } = req.query;
    console.log('📊 Fetching attendance records with filters:', { student_id, room_id, date });

    let query = supabase
      .from('attendance')
      .select('*')
      .order('timestamp', { ascending: false });

    if (student_id) query = query.eq('student_id', student_id);
    if (room_id) query = query.eq('room_id', room_id);
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching attendance:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Successfully fetched ${data.length} attendance records`);
    res.json(data);
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log('\n Available routes:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/students');
  console.log('  GET  /api/students/untrained');
  console.log('  POST /api/face-descriptors');
  console.log('  POST /api/students/:id/trained');
  console.log('  GET  /api/face-descriptors');
  console.log('  POST /api/attendance/confirm');
  console.log('  GET  /api/attendance');
  console.log('\n');
});