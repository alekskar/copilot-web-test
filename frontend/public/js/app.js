// Task Management Dashboard - Main Application
class TaskDashboard {
    constructor() {
        this.apiUrl = '/api';
        this.token = localStorage.getItem('token');
        this.user = null;
        this.tasks = [];
        this.socket = null;
        this.currentView = 'dashboard';
        this.editingTask = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        // Check if user is logged in
        if (this.token) {
            try {
                await this.loadUserProfile();
                this.showMainApp();
                this.setupSocket();
                await this.loadDashboard();
            } catch (error) {
                console.error('Authentication failed:', error);
                this.logout();
            }
        } else {
            this.showAuthScreen();
        }
    }

    setupEventListeners() {
        // Auth form handlers
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Auth tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchAuthTab(e));
        });

        // Navigation handlers
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Header actions
        document.getElementById('user-menu-btn')?.addEventListener('click', () => this.toggleUserMenu());
        document.getElementById('logout-link')?.addEventListener('click', () => this.logout());
        
        // Task actions
        document.getElementById('new-task-btn')?.addEventListener('click', () => this.openTaskModal());
        document.getElementById('add-task-btn')?.addEventListener('click', () => this.openTaskModal());
        document.getElementById('task-form')?.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        document.getElementById('cancel-task-btn')?.addEventListener('click', () => this.closeTaskModal());
        
        // Modal handlers
        document.querySelector('.modal-close')?.addEventListener('click', () => this.closeTaskModal());
        document.getElementById('task-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') this.closeTaskModal();
        });

        // Filter handlers
        document.getElementById('status-filter')?.addEventListener('change', () => this.filterTasks());
        document.getElementById('priority-filter')?.addEventListener('change', () => this.filterTasks());

        // Toast close handler
        document.querySelector('.toast-close')?.addEventListener('click', () => this.hideToast());

        // Click outside to close dropdowns
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                this.hideUserMenu();
            }
        });
    }

    // Authentication Methods
    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.token = result.token;
                this.user = result.user;
                localStorage.setItem('token', this.token);
                this.showToast('Login successful!', 'success');
                this.showMainApp();
                this.setupSocket();
                await this.loadDashboard();
            } else {
                this.showToast(result.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch(`${this.apiUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.token = result.token;
                this.user = result.user;
                localStorage.setItem('token', this.token);
                this.showToast('Registration successful!', 'success');
                this.showMainApp();
                this.setupSocket();
                await this.loadDashboard();
            } else {
                this.showToast(result.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    async loadUserProfile() {
        const response = await fetch(`${this.apiUrl}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${this.token}` }
        });

        if (response.ok) {
            const result = await response.json();
            this.user = result.user;
        } else {
            throw new Error('Failed to load profile');
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.showAuthScreen();
        this.showToast('Logged out successfully', 'success');
    }

    // UI Methods
    showAuthScreen() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
    }

    showMainApp() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
    }

    switchAuthTab(e) {
        const tab = e.target.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update forms
        document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
        document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    }

    handleNavigation(e) {
        e.preventDefault();
        const view = e.target.dataset.view;
        
        if (view) {
            this.switchView(view);
        }
    }

    switchView(view) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Update views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');
        
        this.currentView = view;
        
        // Load view data
        switch (view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'tasks':
                this.loadTasks();
                break;
            case 'calendar':
                // Calendar implementation
                break;
            case 'analytics':
                // Analytics implementation
                break;
        }
    }

    toggleUserMenu() {
        document.getElementById('user-dropdown').classList.toggle('hidden');
    }

    hideUserMenu() {
        document.getElementById('user-dropdown').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const messageEl = document.getElementById('toast-message');
        
        messageEl.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 5000);
    }

    hideToast() {
        document.getElementById('toast').classList.add('hidden');
    }

    // Socket.IO Methods
    setupSocket() {
        if (!this.token) return;
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('authenticate', this.token);
        });

        this.socket.on('authenticated', () => {
            console.log('Socket authenticated');
        });

        this.socket.on('taskCreated', (task) => {
            this.tasks.push(task);
            this.updateTasksUI();
            this.showToast('New task created!', 'success');
        });

        this.socket.on('taskUpdated', (task) => {
            const index = this.tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
                this.tasks[index] = task;
                this.updateTasksUI();
            }
        });

        this.socket.on('taskDeleted', (data) => {
            this.tasks = this.tasks.filter(t => t.id !== data.id);
            this.updateTasksUI();
            this.showToast('Task deleted!', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }

    // Dashboard Methods
    async loadDashboard() {
        try {
            const [statsResponse, weatherResponse, newsResponse] = await Promise.all([
                fetch(`${this.apiUrl}/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }),
                fetch(`${this.apiUrl}/dashboard/weather`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }),
                fetch(`${this.apiUrl}/dashboard/news`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                })
            ]);

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                this.updateDashboardStats(statsData.stats);
            }

            if (weatherResponse.ok) {
                const weatherData = await weatherResponse.json();
                this.updateWeatherWidget(weatherData.weather);
            }

            if (newsResponse.ok) {
                const newsData = await newsResponse.json();
                this.updateNewsWidget(newsData.news);
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('total-tasks').textContent = stats.totalTasks || 0;
        document.getElementById('completed-tasks').textContent = stats.completedTasks || 0;
        document.getElementById('completion-rate').textContent = `${stats.completionRate || 0}%`;
        
        // Update upcoming tasks
        const upcomingContainer = document.getElementById('upcoming-tasks');
        if (stats.upcomingDeadlines && stats.upcomingDeadlines.length > 0) {
            upcomingContainer.innerHTML = stats.upcomingDeadlines.map(task => `
                <div class="task-item">
                    <h4>${task.title}</h4>
                    <p>Due: ${new Date(task.due_date).toLocaleDateString()}</p>
                    <span class="task-priority ${task.priority}">${task.priority}</span>
                </div>
            `).join('');
        } else {
            upcomingContainer.innerHTML = '<div class="no-tasks">No upcoming deadlines</div>';
        }
    }

    updateWeatherWidget(weather) {
        const weatherContent = document.getElementById('weather-content');
        weatherContent.innerHTML = `
            <div class="weather-info">
                <div>
                    <div class="weather-temp">${weather.temperature}°C</div>
                    <div class="weather-desc">${weather.description}</div>
                </div>
                <div>
                    <p><strong>${weather.location}</strong></p>
                    <p>Humidity: ${weather.humidity}%</p>
                </div>
            </div>
        `;
    }

    updateNewsWidget(news) {
        const newsContent = document.getElementById('news-content');
        newsContent.innerHTML = `
            <ul class="news-list">
                ${news.map(item => `
                    <li class="news-item">
                        <div class="news-title">${item.title}</div>
                        <div class="news-source">${item.source}</div>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    // Task Methods
    async loadTasks() {
        try {
            const response = await fetch(`${this.apiUrl}/tasks`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.tasks = data.tasks || [];
                this.updateTasksUI();
            }
        } catch (error) {
            console.error('Load tasks error:', error);
        }
    }

    updateTasksUI() {
        const container = document.getElementById('tasks-container');
        
        if (this.tasks.length === 0) {
            container.innerHTML = '<div class="no-tasks">No tasks found</div>';
            return;
        }

        container.innerHTML = `
            <div class="task-list">
                ${this.tasks.map(task => this.renderTask(task)).join('')}
            </div>
        `;

        // Add event listeners to task actions
        container.querySelectorAll('.edit-task').forEach(btn => {
            btn.addEventListener('click', (e) => this.editTask(e.target.dataset.id));
        });

        container.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteTask(e.target.dataset.id));
        });

        container.querySelectorAll('.toggle-status').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleTaskStatus(e.target.dataset.id));
        });
    }

    renderTask(task) {
        const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
        
        return `
            <div class="task-item ${isOverdue ? 'overdue' : ''}">
                <div class="task-header">
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-priority ${task.priority}">${task.priority}</span>
                </div>
                <div class="task-description">${task.description || ''}</div>
                <div class="task-meta">
                    <span class="task-status ${task.status}">${task.status.replace('_', ' ')}</span>
                    <span class="task-due">${dueDate}</span>
                </div>
                <div class="task-actions">
                    <button class="btn btn-primary edit-task" data-id="${task.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-secondary toggle-status" data-id="${task.id}">
                        <i class="fas fa-check"></i> ${task.status === 'completed' ? 'Reopen' : 'Complete'}
                    </button>
                    <button class="btn btn-secondary delete-task" data-id="${task.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    openTaskModal(task = null) {
        this.editingTask = task;
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        const title = document.getElementById('modal-title');
        
        title.textContent = task ? 'Edit Task' : 'Add New Task';
        
        if (task) {
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-due-date').value = task.due_date ? 
                new Date(task.due_date).toISOString().slice(0, 16) : '';
        } else {
            form.reset();
        }
        
        modal.classList.remove('hidden');
    }

    closeTaskModal() {
        document.getElementById('task-modal').classList.add('hidden');
        this.editingTask = null;
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Convert empty due_date to null
        if (!data.due_date) data.due_date = null;

        try {
            const url = this.editingTask ? 
                `${this.apiUrl}/tasks/${this.editingTask.id}` : 
                `${this.apiUrl}/tasks`;
            
            const method = this.editingTask ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showToast(this.editingTask ? 'Task updated!' : 'Task created!', 'success');
                this.closeTaskModal();
                
                if (this.editingTask) {
                    // Update existing task
                    const index = this.tasks.findIndex(t => t.id === this.editingTask.id);
                    if (index !== -1) {
                        this.tasks[index] = result.task;
                    }
                } else {
                    // Add new task
                    this.tasks.push(result.task);
                }
                
                this.updateTasksUI();
            } else {
                this.showToast(result.error || 'Failed to save task', 'error');
            }
        } catch (error) {
            console.error('Task save error:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    async editTask(taskId) {
        const task = this.tasks.find(t => t.id == taskId);
        if (task) {
            this.openTaskModal(task);
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const response = await fetch(`${this.apiUrl}/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                this.tasks = this.tasks.filter(t => t.id != taskId);
                this.updateTasksUI();
                this.showToast('Task deleted!', 'success');
            } else {
                const result = await response.json();
                this.showToast(result.error || 'Failed to delete task', 'error');
            }
        } catch (error) {
            console.error('Delete task error:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    async toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id == taskId);
        if (!task) return;

        const newStatus = task.status === 'completed' ? 'pending' : 'completed';

        try {
            const response = await fetch(`${this.apiUrl}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const result = await response.json();
                const index = this.tasks.findIndex(t => t.id == taskId);
                if (index !== -1) {
                    this.tasks[index] = result.task;
                }
                this.updateTasksUI();
                this.showToast(`Task ${newStatus}!`, 'success');
            }
        } catch (error) {
            console.error('Toggle task status error:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    filterTasks() {
        const statusFilter = document.getElementById('status-filter').value;
        const priorityFilter = document.getElementById('priority-filter').value;
        
        // This would typically reload tasks with filters
        // For now, just filter the current tasks
        let filteredTasks = [...this.tasks];
        
        if (statusFilter) {
            filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
        }
        
        if (priorityFilter) {
            filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
        }
        
        // Update UI with filtered tasks
        const container = document.getElementById('tasks-container');
        container.innerHTML = `
            <div class="task-list">
                ${filteredTasks.map(task => this.renderTask(task)).join('')}
            </div>
        `;
        
        // Re-add event listeners
        container.querySelectorAll('.edit-task').forEach(btn => {
            btn.addEventListener('click', (e) => this.editTask(e.target.dataset.id));
        });

        container.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteTask(e.target.dataset.id));
        });

        container.querySelectorAll('.toggle-status').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleTaskStatus(e.target.dataset.id));
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new TaskDashboard();
});