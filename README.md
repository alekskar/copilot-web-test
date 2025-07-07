# Task Management Dashboard

A comprehensive task management dashboard designed to test agentic capabilities. This project provides a rich environment for AI agents to demonstrate their ability to work with multi-component web applications.

## Features

### Core Functionality
- ✅ Task creation, editing, and deletion
- ✅ User authentication and authorization
- ✅ Real-time updates across multiple sessions
- ✅ File upload and attachment management
- ✅ Dashboard with productivity insights

### Advanced Features
- 🌤️ Weather widget integration
- 📰 News feed integration
- 📊 Analytics and reporting
- 🔔 Real-time notifications
- 🎨 Customizable themes
- 📱 Responsive design

## Architecture

```
├── frontend/           # React-like vanilla JS frontend
│   ├── src/
│   │   ├── components/
│   │   ├── styles/
│   │   └── utils/
│   └── public/
├── server/            # Express.js backend
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   ├── utils/
│   └── scripts/
├── database/          # SQLite database
└── tests/            # Test suites
```

## Testing Scenarios for Agentic Capabilities

### 1. Multi-File Coordination
- Implementing features that span frontend, backend, and database
- Managing dependencies between components
- Coordinating API contracts between frontend and backend

### 2. API Integration
- Working with external APIs (weather, news)
- Handling rate limiting and error scenarios
- Implementing retry logic and fallback mechanisms

### 3. Database Operations
- Designing and implementing database schemas
- Writing complex queries and migrations
- Handling data relationships and constraints

### 4. Real-time Features
- Implementing WebSocket connections
- Managing real-time state synchronization
- Handling connection drops and reconnections

### 5. Authentication & Security
- Implementing JWT-based authentication
- Adding authorization middleware
- Securing API endpoints and file uploads

### 6. Testing & Debugging
- Writing unit and integration tests
- Debugging complex multi-component issues
- Performance optimization and monitoring

## Getting Started

### Prerequisites
- Node.js 16+ and npm 8+
- SQLite3

### Installation
```bash
# Clone the repository
git clone https://github.com/alekskar/copilot-web-test.git
cd copilot-web-test

# Install dependencies and setup database
npm run setup

# Start development server
npm run dev

# In another terminal, start frontend build watch
npm run dev:frontend
```

### Usage
1. Open http://localhost:3000 in your browser
2. Register a new account or login
3. Start creating and managing tasks
4. Explore the dashboard widgets and features

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile

### Task Management Endpoints
- `GET /api/tasks` - Get all tasks for authenticated user
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/attachments` - Upload file attachment

### Dashboard Endpoints
- `GET /api/dashboard/stats` - Get productivity statistics
- `GET /api/dashboard/weather` - Get weather information
- `GET /api/dashboard/news` - Get news feed

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm test -- --testNamePattern="Auth"
```

## Development Guidelines

### Code Organization
- Use modular architecture with clear separation of concerns
- Implement proper error handling and logging
- Follow RESTful API design principles
- Use consistent naming conventions

### Testing Strategy
- Write tests for all API endpoints
- Test authentication and authorization flows
- Test real-time functionality
- Test file upload and processing
- Test external API integration

## Contributing

This project is designed for testing agentic capabilities. When working on features:

1. Consider the complexity and multi-component nature
2. Implement proper error handling and edge cases
3. Add comprehensive tests for new functionality
4. Update documentation for API changes
5. Consider performance and security implications

## License

Licensed under the Apache License, Version 2.0. See the LICENSE file for details.