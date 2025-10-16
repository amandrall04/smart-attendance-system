# Smart Attendance System 🎯

A modern, AI-powered attendance system that uses facial recognition to automate attendance tracking. Built with React and Node.js, featuring a sleek glassmorphic UI design.

## 🌟 Features

- Real-time face detection and recognition
- Beautiful glassmorphic UI design
- Automatic attendance tracking
- Secure data storage with Supabase
- Responsive web interface
- Multi-mode operation (Training/Recognition)

## 🛠️ Technology Stack

### Frontend
- React.js
- face-api.js for facial recognition
- Tailwind CSS for styling
- Glassmorphic UI components
- Supabase Client

### Backend
- Node.js
- Express.js
- Supabase for database
- CORS for secure cross-origin requests
- Environment variables for configuration

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/amandrall04/smart-attendance-system.git
cd smart-attendance-system
```

2. Install frontend dependencies:
```bash
cd attendance-frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../server
npm install
```

4. Create a `.env` file in the server directory with your Supabase credentials:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

5. Start the development servers:

Frontend:
```bash
cd attendance-frontend
npm start
```

Backend:
```bash
cd server
npm run dev
```

## 💡 Usage

1. **Training Mode**:
   - Select "Training Mode"
   - Enter the person's name
   - Capture facial data through webcam
   - Submit to save the face data

2. **Recognition Mode**:
   - Select "Recognition Mode"
   - The system will automatically detect and recognize faces
   - Attendance is marked automatically for recognized individuals

## 🏗️ Project Structure

```
smart-attendance-system/
├── attendance-frontend/     # React frontend
│   ├── public/             # Static files and face models
│   └── src/               # Source files
│       ├── App.jsx        # Main application component
│       ├── api.js         # API integration
│       └── style.css      # Styling with Tailwind CSS
│
└── server/                # Node.js backend
    ├── server.js         # Express server setup
    └── package.json      # Backend dependencies
```

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributors

- [Aman Drall](https://github.com/amandrall04)
- [Megh Vyas](https://github.com/MeghVyas3132)
- [Dharmi Chandarana](https://github.com/dharmichandarana)

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, please raise an issue in the GitHub repository or contact the maintainers.
