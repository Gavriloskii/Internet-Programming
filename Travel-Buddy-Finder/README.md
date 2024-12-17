# Travel Buddy Finder

A full-stack web application that helps travelers find compatible travel companions based on personality matching, shared interests, and travel preferences.

## Features

- 🧩 Personality Quiz & Matching
- 👥 Swipe-to-Match Interface
- 💬 Real-time Chat
- 👥 Group Travel Planning
- ✍️ Travel Journal
- 🌍 Location Sharing
- 🔒 Secure Authentication
- 📱 Responsive Design

## Tech Stack

### Backend
- Node.js & Express
- MongoDB with Mongoose
- Socket.IO for real-time features
- JWT Authentication
- Rate Limiting & Security Middleware

### Frontend
- React with Redux Toolkit
- Tailwind CSS
- Socket.IO Client
- React Router
- React Spring for animations

## Prerequisites

- Node.js (v16.0.0 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/travel-buddy-finder.git
cd travel-buddy-finder
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Create environment files:

Backend (.env):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/travel-buddy
JWT_SECRET=your_secure_secret
NODE_ENV=development
```

Frontend (.env):
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
```

## Running the Application

1. Start MongoDB:
```bash
mongod
```

2. Start the backend server:
```bash
cd backend
npm run dev
```

3. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api/docs

## Testing

### Backend Tests
```bash
cd backend
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Development

### Code Quality
- ESLint is configured for code linting
- Prettier for code formatting
- Husky for pre-commit hooks
- Jest for testing

### Pre-deployment Checks
Run the pre-deployment script:
```bash
cd backend
npm run pre-deploy
```

This will:
- Check Node.js version
- Verify MongoDB connection
- Run linting
- Run tests
- Check security vulnerabilities
- Verify environment variables
- Create backup

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh JWT token

### Group Endpoints
- `POST /api/groups` - Create new group
- `GET /api/groups` - Get all groups
- `GET /api/groups/:id` - Get single group
- `PATCH /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Journal Endpoints
- `POST /api/journals` - Create new journal
- `GET /api/journals` - Get all journals
- `GET /api/journals/feed` - Get user feed
- `GET /api/journals/:id` - Get single journal
- `PATCH /api/journals/:id` - Update journal
- `DELETE /api/journals/:id` - Delete journal

## Security Features

- JWT Authentication
- CSRF Protection
- Rate Limiting
- Input Validation
- XSS Prevention
- MongoDB Sanitization
- Secure HTTP Headers
- Cookie Security

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Socket.IO](https://socket.io/) for real-time features
- [MongoDB](https://www.mongodb.com/) for database
- [Express](https://expressjs.com/) for backend framework
- [React](https://reactjs.org/) for frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling

## Contact

Your Name - [@yourusername](https://twitter.com/yourusername)

Project Link: [https://github.com/yourusername/travel-buddy-finder](https://github.com/yourusername/travel-buddy-finder)
