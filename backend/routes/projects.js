const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const User = require('../models/User');

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, deadline, members } = req.body;
    
    const project = new Project({
      name,
      description,
      owner: req.user.id,
      deadline,
      members: [{ user: req.user.id, role: 'admin' }]
    });
    
    if (members && members.length) {
      members.forEach(memberId => {
        if (memberId !== req.user.id) {
          project.members.push({ user: memberId, role: 'member' });
        }
      });
    }
    
    await project.save();
    await project.populate('members.user', 'name email');
    
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all projects for user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.id },
        { 'members.user': req.user.id }
      ]
    }).populate('members.user', 'name email').populate('owner', 'name email').sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('owner', 'name email');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const isMember = project.members.some(m => m.user._id.toString() === req.user.id) ||
                     project.owner._id.toString() === req.user.id;
    
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const isAdmin = project.members.some(m => m.user.toString() === req.user.id && m.role === 'admin') ||
                    project.owner.toString() === req.user.id;
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can update projects' });
    }
    
    const { name, description, deadline, status } = req.body;
    if (name) project.name = name;
    if (description) project.description = description;
    if (deadline) project.deadline = deadline;
    if (status) project.status = status;
    
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to project
router.post('/:id/members', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const isAdmin = project.members.some(m => m.user.toString() === req.user.id && m.role === 'admin') ||
                    project.owner.toString() === req.user.id;
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }
    
    const { email, role } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const alreadyMember = project.members.some(m => m.user.toString() === user._id.toString());
    if (alreadyMember) {
      return res.status(400).json({ message: 'User already in project' });
    }
    
    project.members.push({ user: user._id, role: role || 'member' });
    await project.save();
    await project.populate('members.user', 'name email');
    
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const isAdmin = project.members.some(m => m.user.toString() === req.user.id && m.role === 'admin') ||
                    project.owner.toString() === req.user.id;
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can delete projects' });
    }
    
    await project.deleteOne();
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;