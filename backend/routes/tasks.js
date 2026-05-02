const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, projectId, assignedTo, dueDate, priority } = req.body;
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const isAdmin = project.members.some(m => m.user.toString() === req.user.id && m.role === 'admin') ||
                    project.owner.toString() === req.user.id;
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can create tasks' });
    }
    
    const task = new Task({
      title,
      description,
      project: projectId,
      assignedTo,
      assignedBy: req.user.id,
      dueDate,
      priority
    });
    
    await task.save();
    await task.populate('assignedTo', 'name email');
    await task.populate('assignedBy', 'name email');
    await task.populate('project', 'name');
    
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks for user
router.get('/', auth, async (req, res) => {
  try {
    const { status, projectId } = req.query;
    let query = { assignedTo: req.user.id };
    
    if (status) query.status = status;
    if (projectId) query.project = projectId;
    
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('project', 'name')
      .sort({ dueDate: 1 });
    
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get project tasks
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const isMember = project.members.some(m => m.user.toString() === req.user.id) ||
                     project.owner.toString() === req.user.id;
    
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ dueDate: 1 });
    
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only assigned user can update task status' });
    }
    
    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
    }
    
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const project = await Project.findById(task.project._id);
    const isAdmin = project.members.some(m => m.user.toString() === req.user.id && m.role === 'admin') ||
                    project.owner.toString() === req.user.id;
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can update tasks' });
    }
    
    const { title, description, assignedTo, dueDate, priority } = req.body;
    if (title) task.title = title;
    if (description) task.description = description;
    if (assignedTo) task.assignedTo = assignedTo;
    if (dueDate) task.dueDate = dueDate;
    if (priority) task.priority = priority;
    
    await task.save();
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment to task
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { comment } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    task.comments.push({
      user: req.user.id,
      comment
    });
    
    await task.save();
    await task.populate('comments.user', 'name email');
    
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard summary
router.get('/dashboard/summary', auth, async (req, res) => {
  try {
    const allTasks = await Task.find({ assignedTo: req.user.id });
    
    const summary = {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      inProgress: allTasks.filter(t => t.status === 'in-progress').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      overdue: allTasks.filter(t => t.status === 'overdue').length,
      recentTasks: await Task.find({ assignedTo: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('project', 'name'),
      overdueTasks: await Task.find({ 
        assignedTo: req.user.id,
        status: 'overdue'
      }).populate('project', 'name')
    };
    
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const project = await Project.findById(task.project._id);
    const isAdmin = project.members.some(m => m.user.toString() === req.user.id && m.role === 'admin') ||
                    project.owner.toString() === req.user.id;
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can delete tasks' });
    }
    
    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;