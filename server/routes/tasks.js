const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { database } = require('../utils/database');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, documents, and archives are allowed'));
    }
  }
});

// Get all tasks for authenticated user
router.get('/', async (req, res) => {
  try {
    const { status, priority, sort = 'created_at', order = 'DESC' } = req.query;
    
    let query = `
      SELECT t.*, 
             COUNT(ta.id) as attachment_count
      FROM tasks t
      LEFT JOIN task_attachments ta ON t.id = ta.task_id
      WHERE t.user_id = ?
    `;
    
    const params = [req.user.id];
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    
    query += ' GROUP BY t.id';
    
    // Validate sort and order parameters
    const validSorts = ['created_at', 'updated_at', 'due_date', 'title', 'priority'];
    const validOrders = ['ASC', 'DESC'];
    
    if (validSorts.includes(sort) && validOrders.includes(order.toUpperCase())) {
      query += ` ORDER BY t.${sort} ${order.toUpperCase()}`;
    }
    
    const tasks = await database.all(query, params);
    
    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task by ID
router.get('/:id', async (req, res) => {
  try {
    const task = await database.get(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Get task attachments
    const attachments = await database.all(
      'SELECT * FROM task_attachments WHERE task_id = ?',
      [task.id]
    );
    
    res.json({ task: { ...task, attachments } });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create new task
router.post('/', async (req, res) => {
  try {
    const { title, description, priority = 'medium', due_date } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }
    
    const result = await database.run(
      'INSERT INTO tasks (user_id, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title.trim(), description, priority, due_date || null]
    );
    
    const task = await database.get(
      'SELECT * FROM tasks WHERE id = ?',
      [result.id]
    );
    
    // Emit real-time update
    if (req.app.locals.io) {
      req.app.locals.io.to(`user_${req.user.id}`).emit('taskCreated', task);
    }
    
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, due_date } = req.body;
    
    // Verify task exists and belongs to user
    const existingTask = await database.get(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Validate inputs
    if (title && title.trim().length === 0) {
      return res.status(400).json({ error: 'Task title cannot be empty' });
    }
    
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }
    
    await database.run(
      `UPDATE tasks 
       SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        title || existingTask.title,
        description !== undefined ? description : existingTask.description,
        status || existingTask.status,
        priority || existingTask.priority,
        due_date !== undefined ? due_date : existingTask.due_date,
        req.params.id,
        req.user.id
      ]
    );
    
    const updatedTask = await database.get(
      'SELECT * FROM tasks WHERE id = ?',
      [req.params.id]
    );
    
    // Emit real-time update
    if (req.app.locals.io) {
      req.app.locals.io.to(`user_${req.user.id}`).emit('taskUpdated', updatedTask);
    }
    
    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await database.get(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Delete task attachments from filesystem
    const attachments = await database.all(
      'SELECT filename FROM task_attachments WHERE task_id = ?',
      [req.params.id]
    );
    
    for (const attachment of attachments) {
      const filePath = path.join(__dirname, '../../uploads', attachment.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Delete task (attachments will be deleted by CASCADE)
    await database.run(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    // Emit real-time update
    if (req.app.locals.io) {
      req.app.locals.io.to(`user_${req.user.id}`).emit('taskDeleted', { id: req.params.id });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Upload attachment to task
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verify task exists and belongs to user
    const task = await database.get(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (!task) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Save attachment info to database
    const result = await database.run(
      'INSERT INTO task_attachments (task_id, filename, original_name, file_size, mime_type) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype]
    );
    
    const attachment = await database.get(
      'SELECT * FROM task_attachments WHERE id = ?',
      [result.id]
    );
    
    res.status(201).json({ 
      message: 'File uploaded successfully', 
      attachment 
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Delete attachment
router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const attachment = await database.get(
      `SELECT ta.*, t.user_id
       FROM task_attachments ta
       JOIN tasks t ON ta.task_id = t.id
       WHERE ta.id = ? AND t.user_id = ?`,
      [req.params.attachmentId, req.user.id]
    );
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../uploads', attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await database.run(
      'DELETE FROM task_attachments WHERE id = ?',
      [req.params.attachmentId]
    );
    
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

module.exports = router;