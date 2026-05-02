const API_URL = window.location.origin + '/api';

class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['x-auth-token'] = this.token;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers: this.getHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async signup(userData) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    // Projects
    async getProjects() {
        return this.request('/projects');
    }

    async getProject(id) {
        return this.request(`/projects/${id}`);
    }

    async createProject(projectData) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    async updateProject(id, projectData) {
        return this.request(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    async deleteProject(id) {
        return this.request(`/projects/${id}`, {
            method: 'DELETE'
        });
    }

    async addMember(projectId, memberData) {
        return this.request(`/projects/${projectId}/members`, {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
    }

    // Tasks
    async getTasks(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return this.request(`/tasks${query ? '?' + query : ''}`);
    }

    async getProjectTasks(projectId) {
        return this.request(`/tasks/project/${projectId}`);
    }

    async createTask(taskData) {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }

    async updateTaskStatus(id, status) {
        return this.request(`/tasks/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    async updateTask(id, taskData) {
        return this.request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
    }

    async deleteTask(id) {
        return this.request(`/tasks/${id}`, {
            method: 'DELETE'
        });
    }

    async addComment(taskId, comment) {
        return this.request(`/tasks/${taskId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ comment })
        });
    }

    async getDashboardSummary() {
        return this.request('/tasks/dashboard/summary');
    }

    // Users
    async getUsers() {
        return this.request('/users');
    }
}

const api = new API();