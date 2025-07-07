function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Handle user authentication for socket
    socket.on('authenticate', (token) => {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production');
        
        socket.userId = decoded.id;
        socket.join(`user_${decoded.id}`);
        
        console.log(`User ${decoded.id} authenticated and joined room`);
        socket.emit('authenticated', { success: true });
      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('authentication_error', { error: 'Invalid token' });
      }
    });
    
    // Handle task real-time updates
    socket.on('taskUpdate', (data) => {
      if (socket.userId) {
        // Broadcast to all sessions of the same user
        socket.to(`user_${socket.userId}`).emit('taskUpdated', data);
      }
    });
    
    // Handle typing indicators for collaborative features
    socket.on('typing', (data) => {
      if (socket.userId) {
        socket.to(`user_${socket.userId}`).emit('userTyping', {
          userId: socket.userId,
          taskId: data.taskId,
          isTyping: data.isTyping
        });
      }
    });
    
    // Handle presence updates
    socket.on('updatePresence', (status) => {
      if (socket.userId) {
        socket.to(`user_${socket.userId}`).emit('presenceUpdated', {
          userId: socket.userId,
          status: status
        });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      if (socket.userId) {
        // Notify other sessions that user is offline
        socket.to(`user_${socket.userId}`).emit('userOffline', {
          userId: socket.userId
        });
      }
    });
    
    // Handle custom events for future features
    socket.on('customEvent', (data) => {
      if (socket.userId) {
        // Echo the event to all user sessions
        io.to(`user_${socket.userId}`).emit('customEvent', data);
      }
    });
  });
  
  // Periodic cleanup of empty rooms
  setInterval(() => {
    const rooms = io.sockets.adapter.rooms;
    let emptyRooms = 0;
    
    for (const [roomName, room] of rooms) {
      if (roomName.startsWith('user_') && room.size === 0) {
        emptyRooms++;
      }
    }
    
    if (emptyRooms > 0) {
      console.log(`Cleaned up ${emptyRooms} empty rooms`);
    }
  }, 60000); // Run every minute
}

module.exports = {
  setupSocketHandlers
};