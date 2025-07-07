const request = require('supertest');
const { app } = require('../server/index');

let authToken;
let userId;

beforeAll(async () => {
  // Register and login a test user
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'tasktest',
      email: 'tasktest@example.com',
      password: 'testpassword123'
    });

  authToken = registerResponse.body.token;
  userId = registerResponse.body.user.id;
});

describe('Tasks API', () => {
  let taskId;

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          description: 'This is a test task',
          priority: 'high',
          due_date: '2024-12-31T23:59:59'
        });

      expect(response.status).toBe(201);
      expect(response.body.task.title).toBe('Test Task');
      expect(response.body.task.description).toBe('This is a test task');
      expect(response.body.task.priority).toBe('high');
      expect(response.body.task.user_id).toBe(userId);
      
      taskId = response.body.task.id;
    });

    it('should not create task without title', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Task without title',
          priority: 'medium'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('title is required');
    });

    it('should not create task without authentication', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Unauthorized Task',
          description: 'This should fail'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tasks', () => {
    it('should get all tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeInstanceOf(Array);
      expect(response.body.tasks.length).toBeGreaterThan(0);
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeInstanceOf(Array);
      // All returned tasks should have status 'pending'
      response.body.tasks.forEach(task => {
        expect(task.status).toBe('pending');
      });
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should get specific task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.task.id).toBe(taskId);
      expect(response.body.task.title).toBe('Test Task');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/tasks/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Test Task',
          status: 'completed'
        });

      expect(response.status).toBe(200);
      expect(response.body.task.title).toBe('Updated Test Task');
      expect(response.body.task.status).toBe('completed');
    });

    it('should not update task with invalid status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid status');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 when trying to delete non-existent task', async () => {
      const response = await request(app)
        .delete('/api/tasks/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});