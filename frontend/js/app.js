// Global app state
let currentUser = null;
let projects = [];
let allUsers = [];
let currentProjectDetails = null;

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Page navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.nav-link[data-page="${pageId.replace('Page', '')}"]`);
    if (activeLink) activeLink.classList.add('active');
}

// Load dashboard
async function loadDashboard() {
    try {
        const summary = await api.getDashboardSummary();
        
        const statsHtml = `
            <div class="stat-card total">
                <h3>Total Tasks</h3>
                <div class="stat-number">${summary.total}</div>
            </div>
            <div class="stat-card pending">
                <h3>Pending</h3>
                <div class="stat-number">${summary.pending}</div>
            </div>
            <div class="stat-card in-progress">
                <h3>In Progress</h3>
                <div class="stat-number">${summary.inProgress}</div>
            </div>
            <div class="stat-card completed">
                <h3>Completed</h3>
                <div class="stat-number">${summary.completed}</div>
            </div>
            <div class="stat-card overdue">
                <h3>Overdue</h3>
                <div class="stat-number">${summary.overdue}</div>
            </div>
        `;
        
        document.getElementById('dashboardSummary').innerHTML = statsHtml;
        
        // Recent tasks
        if (summary.recentTasks && summary.recentTasks.length > 0) {
            const recentTasksHtml = summary.recentTasks.map(task => `
                <div class="task-item" onclick="viewTaskDetails('${task._id}')">
                    <div class="task-info">
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            <span>Project: ${task.project?.name || 'N/A'}</span>
                            <span class="task-status status-${task.status}">${task.status}</span>
                            <span>Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            document.getElementById('recentTasks').innerHTML = recentTasksHtml;
        } else {
            document.getElementById('recentTasks').innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>No recent tasks</p></div>';
        }
        
        // Overdue tasks
        if (summary.overdueTasks && summary.overdueTasks.length > 0) {
            const overdueTasksHtml = summary.overdueTasks.map(task => `
                <div class="task-item" onclick="viewTaskDetails('${task._id}')">
                    <div class="task-info">
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            <span>Project: ${task.project?.name || 'N/A'}</span>
                            <span>Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            document.getElementById('overdueTasks').innerHTML = overdueTasksHtml;
        } else {
            document.getElementById('overdueTasks').innerHTML = '<div class="empty-state"><i class="fas fa-smile"></i><p>No overdue tasks</p></div>';
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard', 'error');
    }
}

// Load projects
async function loadProjects() {
    try {
        projects = await api.getProjects();
        
        if (projects.length === 0) {
            document.getElementById('projectsList').innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No projects found. Create your first project!</p></div>';
            return;
        }
        
        const projectsHtml = projects.map(project => `
            <div class="project-card">
                <div class="project-header">
                    <h3 onclick="showProjectDetails('${project._id}')" style="cursor: pointer;">${escapeHtml(project.name)}</h3>
                    <span class="project-status ${project.status}">${project.status}</span>
                </div>
                <div class="project-description">${escapeHtml(project.description.substring(0, 100))}${project.description.length > 100 ? '...' : ''}</div>
                <div class="project-footer">
                    <div class="project-deadline">
                        <i class="far fa-calendar-alt"></i> Due: ${new Date(project.deadline).toLocaleDateString()}
                    </div>
                    <div class="project-actions">
                        <button class="icon-btn" onclick="showProjectDetails('${project._id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${currentUser?.role === 'admin' || project.owner?._id === currentUser?.id ? `
                            <button class="icon-btn" onclick="editProject('${project._id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="icon-btn" onclick="deleteProject('${project._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="icon-btn" onclick="showAddMemberModal('${project._id}')" title="Add Member">
                                <i class="fas fa-user-plus"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('projectsList').innerHTML = projectsHtml;
        
        // Populate project dropdown for task creation
        const projectSelect = document.getElementById('taskProject');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">Select Project</option>' + 
                projects.map(p => `<option value="${p._id}">${escapeHtml(p.name)}</option>`).join('');
        }
        
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Failed to load projects', 'error');
    }
}

// Show project details with members and tasks
async function showProjectDetails(projectId) {
    try {
        const project = await api.getProject(projectId);
        const tasks = await api.getProjectTasks(projectId);
        
        const membersHtml = project.members.map(m => `
            <div class="member-badge ${m.role === 'admin' ? 'admin' : ''}">
                <i class="fas fa-user"></i>
                ${escapeHtml(m.user.name)} (${m.role})
            </div>
        `).join('');
        
        const tasksHtml = tasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span>Assigned to: ${task.assignedTo?.name || 'Unassigned'}</span>
                        <span class="task-priority priority-${task.priority}">${task.priority}</span>
                        <span class="task-status status-${task.status}">${task.status}</span>
                        <span>Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="task-actions">
                    ${task.assignedTo?._id === currentUser?.id ? `
                        <select class="status-select" onchange="updateTaskStatus('${task._id}', this.value, true)">
                            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    ` : ''}
                    <button class="icon-btn" onclick="viewTaskComments('${task._id}')" title="Comments">
                        <i class="fas fa-comment"></i> (${task.comments?.length || 0})
                    </button>
                </div>
            </div>
        `).join('');
        
        const content = `
            <div class="project-details-section">
                <h3><i class="fas fa-info-circle"></i> Description</h3>
                <p>${escapeHtml(project.description)}</p>
            </div>
            <div class="project-details-section">
                <h3><i class="fas fa-calendar"></i> Timeline</h3>
                <p><strong>Created:</strong> ${new Date(project.createdAt).toLocaleDateString()}</p>
                <p><strong>Deadline:</strong> ${new Date(project.deadline).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span class="project-status ${project.status}">${project.status}</span></p>
            </div>
            <div class="project-details-section">
                <h3><i class="fas fa-users"></i> Team Members (${project.members.length})</h3>
                <div class="members-list">${membersHtml}</div>
            </div>
            <div class="project-details-section">
                <h3><i class="fas fa-tasks"></i> Tasks (${tasks.length})</h3>
                <div class="project-tasks-list">${tasksHtml || '<div class="empty-state"><p>No tasks yet</p></div>'}</div>
            </div>
            ${currentUser?.role === 'admin' || project.owner?._id === currentUser?.id ? `
                <div class="project-details-section">
                    <button class="btn btn-primary" onclick="closeModal('projectDetailsModal'); showTaskModalForProject('${projectId}')">
                        <i class="fas fa-plus"></i> Add Task
                    </button>
                </div>
            ` : ''}
        `;
        
        document.getElementById('projectDetailsTitle').textContent = project.name;
        document.getElementById('projectDetailsContent').innerHTML = content;
        showModal('projectDetailsModal');
        
    } catch (error) {
        console.error('Error loading project details:', error);
        showToast('Failed to load project details', 'error');
    }
}

// Load tasks
async function loadTasks() {
    try {
        const filter = document.getElementById('taskFilter')?.value || 'all';
        const filters = filter !== 'all' ? { status: filter } : {};
        const tasks = await api.getTasks(filters);
        
        if (tasks.length === 0) {
            document.getElementById('tasksList').innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>No tasks assigned to you</p></div>';
            return;
        }
        
        const tasksHtml = tasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-description">${escapeHtml(task.description.substring(0, 100))}</div>
                    <div class="task-meta">
                        <span>Project: ${task.project?.name || 'N/A'}</span>
                        <span class="task-priority priority-${task.priority}">${task.priority}</span>
                        <span class="task-status status-${task.status}">${task.status}</span>
                        <span>Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <select class="status-select" onchange="updateTaskStatus('${task._id}', this.value, true)">
                        <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button class="icon-btn" onclick="viewTaskComments('${task._id}')" title="Comments">
                        <i class="fas fa-comment"></i> (${task.comments?.length || 0})
                    </button>
                    ${currentUser?.role === 'admin' ? `
                        <button class="icon-btn" onclick="editTask('${task._id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        document.getElementById('tasksList').innerHTML = tasksHtml;
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Failed to load tasks', 'error');
    }
}

// View task comments
async function viewTaskComments(taskId) {
    try {
        const tasks = await api.getTasks();
        const task = tasks.find(t => t._id === taskId);
        
        if (!task) {
            showToast('Task not found', 'error');
            return;
        }
        
        const commentsHtml = task.comments && task.comments.length > 0 ? 
            task.comments.map(comment => `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(comment.user?.name || 'Unknown')}</span>
                        <span class="comment-date">${new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="comment-text">${escapeHtml(comment.comment)}</div>
                </div>
            `).join('') : 
            '<div class="empty-state"><p>No comments yet</p></div>';
        
        document.getElementById('commentsList').innerHTML = commentsHtml;
        document.getElementById('commentTaskId').value = taskId;
        showModal('commentsModal');
        
    } catch (error) {
        console.error('Error loading comments:', error);
        showToast('Failed to load comments', 'error');
    }
}

// Add comment to task
async function addCommentToTask(taskId, comment) {
    try {
        await api.addComment(taskId, comment);
        showToast('Comment added successfully');
        closeModal('commentsModal');
        // Refresh current view
        if (document.getElementById('tasksPage').classList.contains('active')) {
            await loadTasks();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Update task status
async function updateTaskStatus(id, status, refreshCurrentView = true) {
    try {
        await api.updateTaskStatus(id, status);
        showToast('Task status updated');
        
        if (refreshCurrentView) {
            if (document.getElementById('dashboardPage').classList.contains('active')) {
                await loadDashboard();
            } else if (document.getElementById('tasksPage').classList.contains('active')) {
                await loadTasks();
            } else if (document.getElementById('projectsPage').classList.contains('active')) {
                await loadProjects();
            }
        }
        
        // If project details modal is open, refresh it
        if (document.getElementById('projectDetailsModal').style.display === 'block' && currentProjectDetails) {
            await showProjectDetails(currentProjectDetails);
        }
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Load users for assignment (only project members)
async function loadUsersForProject(projectId) {
    try {
        const project = await api.getProject(projectId);
        const memberIds = project.members.map(m => m.user._id);
        const allUsersList = await api.getUsers();
        const projectMembers = allUsersList.filter(u => memberIds.includes(u._id));
        
        const assigneeSelect = document.getElementById('taskAssignee');
        if (assigneeSelect) {
            assigneeSelect.innerHTML = '<option value="">Assign To</option>' + 
                projectMembers.map(u => `<option value="${u._id}">${escapeHtml(u.name)} (${u.email})</option>`).join('');
        }
        
        return projectMembers;
    } catch (error) {
        console.error('Error loading project members:', error);
        return [];
    }
}

// Create project
async function createProject(projectData) {
    try {
        await api.createProject(projectData);
        showToast('Project created successfully');
        await loadProjects();
        closeModal('projectModal');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Update project
async function updateProject(id, projectData) {
    try {
        await api.updateProject(id, projectData);
        showToast('Project updated successfully');
        await loadProjects();
        closeModal('projectModal');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Delete project
async function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project? This will also delete all tasks in this project.')) {
        try {
            await api.deleteProject(id);
            showToast('Project deleted successfully');
            await loadProjects();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

// Edit project
function editProject(id) {
    const project = projects.find(p => p._id === id);
    if (project) {
        document.getElementById('projectModalTitle').textContent = 'Edit Project';
        document.getElementById('projectId').value = project._id;
        document.getElementById('projectName').value = project.name;
        document.getElementById('projectDescription').value = project.description;
        document.getElementById('projectDeadline').value = project.deadline.split('T')[0];
        showModal('projectModal');
    }
}

// Show task modal for specific project
async function showTaskModalForProject(projectId) {
    await loadUsersForProject(projectId);
    document.getElementById('taskProject').value = projectId;
    document.getElementById('taskModalTitle').textContent = 'Create Task';
    document.getElementById('taskId').value = '';
    document.getElementById('taskForm').reset();
    document.getElementById('taskProject').value = projectId;
    showModal('taskModal');
}

// Create task
async function createTask(taskData) {
    try {
        await api.createTask(taskData);
        showToast('Task created successfully');
        await loadTasks();
        closeModal('taskModal');
        
        // Refresh project details if open
        if (document.getElementById('projectDetailsModal').style.display === 'block') {
            const projectId = taskData.projectId;
            await showProjectDetails(projectId);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Update task
async function updateTask(id, taskData) {
    try {
        await api.updateTask(id, taskData);
        showToast('Task updated successfully');
        await loadTasks();
        closeModal('taskModal');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Edit task
async function editTask(id) {
    try {
        const tasks = await api.getTasks();
        const task = tasks.find(t => t._id === id);
        if (task) {
            await loadUsersForProject(task.project._id);
            
            document.getElementById('taskModalTitle').textContent = 'Edit Task';
            document.getElementById('taskId').value = task._id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskProject').value = task.project._id;
            document.getElementById('taskAssignee').value = task.assignedTo?._id || '';
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskDueDate').value = task.dueDate.split('T')[0];
            showModal('taskModal');
        }
    } catch (error) {
        showToast('Failed to load task', 'error');
    }
}

// Add member to project
async function addMemberToProject(projectId, memberData) {
    try {
        await api.addMember(projectId, memberData);
        showToast('Member added successfully');
        await loadProjects();
        closeModal('addMemberModal');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// View task details
async function viewTaskDetails(taskId) {
    try {
        const tasks = await api.getTasks();
        const task = tasks.find(t => t._id === taskId);
        if (task) {
            alert(`Task: ${task.title}\n\nDescription: ${task.description}\n\nProject: ${task.project?.name}\n\nStatus: ${task.status}\n\nPriority: ${task.priority}\n\nDue Date: ${new Date(task.dueDate).toLocaleDateString()}`);
        }
    } catch (error) {
        showToast('Failed to load task details', 'error');
    }
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset forms
    if (modalId === 'projectModal') {
        document.getElementById('projectForm').reset();
        document.getElementById('projectId').value = '';
        document.getElementById('projectModalTitle').textContent = 'Create Project';
    } else if (modalId === 'taskModal') {
        document.getElementById('taskForm').reset();
        document.getElementById('taskId').value = '';
        document.getElementById('taskModalTitle').textContent = 'Create Task';
    } else if (modalId === 'commentsModal') {
        document.getElementById('addCommentForm').reset();
    }
}

function showAddMemberModal(projectId) {
    document.getElementById('memberProjectId').value = projectId;
    showModal('addMemberModal');
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load users for admin
async function loadUsers() {
    try {
        if (currentUser?.role === 'admin') {
            allUsers = await api.getUsers();
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Initialize event listeners
function initEventListeners() {
    // Create project button
    const createProjectBtn = document.getElementById('createProjectBtn');
    if (createProjectBtn) {
        createProjectBtn.onclick = () => showModal('projectModal');
    }
    
    // Project form submission
    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
        projectForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('projectId').value;
            const projectData = {
                name: document.getElementById('projectName').value,
                description: document.getElementById('projectDescription').value,
                deadline: document.getElementById('projectDeadline').value
            };
            
            if (id) {
                await updateProject(id, projectData);
            } else {
                await createProject(projectData);
            }
        };
    }
    
    // Task form submission
    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('taskId').value;
            const taskData = {
                title: document.getElementById('taskTitle').value,
                description: document.getElementById('taskDescription').value,
                projectId: document.getElementById('taskProject').value,
                assignedTo: document.getElementById('taskAssignee').value,
                priority: document.getElementById('taskPriority').value,
                dueDate: document.getElementById('taskDueDate').value
            };
            
            if (!taskData.projectId) {
                showToast('Please select a project', 'error');
                return;
            }
            
            if (!taskData.assignedTo) {
                showToast('Please assign the task to a team member', 'error');
                return;
            }
            
            if (id) {
                await updateTask(id, taskData);
            } else {
                await createTask(taskData);
            }
        };
    }
    
    // Add member form submission
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
        addMemberForm.onsubmit = async (e) => {
            e.preventDefault();
            const projectId = document.getElementById('memberProjectId').value;
            const memberData = {
                email: document.getElementById('memberEmail').value,
                role: document.getElementById('memberRole').value
            };
            await addMemberToProject(projectId, memberData);
            document.getElementById('addMemberForm').reset();
        };
    }
    
    // Add comment form submission
    const addCommentForm = document.getElementById('addCommentForm');
    if (addCommentForm) {
        addCommentForm.onsubmit = async (e) => {
            e.preventDefault();
            const taskId = document.getElementById('commentTaskId').value;
            const comment = document.getElementById('commentText').value;
            await addCommentToTask(taskId, comment);
        };
    }
    
    // Task filter
    const taskFilter = document.getElementById('taskFilter');
    if (taskFilter) {
        taskFilter.onchange = () => loadTasks();
    }
    
    // Project select change - load members for assignment
    const taskProject = document.getElementById('taskProject');
    if (taskProject) {
        taskProject.onchange = async () => {
            const projectId = taskProject.value;
            if (projectId) {
                await loadUsersForProject(projectId);
            } else {
                const assigneeSelect = document.getElementById('taskAssignee');
                if (assigneeSelect) {
                    assigneeSelect.innerHTML = '<option value="">Select Project First</option>';
                }
            }
        };
    }
    
    // Close modals when clicking on X
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.onclick = () => {
            const modal = closeBtn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        };
    });
    
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            showPage(`${page}Page`);
            
            // Load page-specific data
            if (page === 'dashboard') loadDashboard();
            else if (page === 'projects') loadProjects();
            else if (page === 'tasks') loadTasks();
        };
    });
}

// Initialize app after login
async function initApp(user) {
    currentUser = user;
    
    // Update navigation
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = user.role;
    document.getElementById('navbar').style.display = 'block';
    
    // Load initial data
    await loadUsers();
    await loadDashboard();
    
    // Show dashboard
    showPage('dashboardPage');
    
    // Initialize event listeners
    initEventListeners();
}

// Make functions global for onclick handlers
window.showProjectDetails = showProjectDetails;
window.editProject = editProject;
window.deleteProject = deleteProject;
window.showAddMemberModal = showAddMemberModal;
window.updateTaskStatus = updateTaskStatus;
window.viewTaskComments = viewTaskComments;
window.editTask = editTask;
window.viewTaskDetails = viewTaskDetails;
window.showTaskModalForProject = showTaskModalForProject;
window.closeModal = closeModal;