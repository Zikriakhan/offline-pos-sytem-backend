const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, plainPassword } = req.body; // plainPassword is ignored if sent
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Check if email already exists (email is primary key)
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Hash password only, plainPassword is not stored anywhere
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, status: 'active' });
    
    const secret = process.env.JWT_SECRET || 'change_this_secret';
    const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: '7d' });
    
    res.status(201).json({ 
      message: 'Signup successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status }
    });
  } catch (err) {
    // If it's a duplicate email error, return proper message
    if (err.code === 11000 || err.message.includes('duplicate')) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Find user by email (email is the primary key)
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Compare provided password with hashed password first
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Check if user is active (only after password is verified)
    if (user.status === 'inactive') {
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact admin.',
        contactAdmin: {
          email: 'muhammadjanzikria@gmail.com',
          phone: '03137709330'
        }
      });
    }
    
    const secret = process.env.JWT_SECRET || 'change_this_secret';
    const token = jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: '7d' });
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status }
    });
  } catch (err) {
    // Return generic error message for any server errors
    return res.status(400).json({ message: 'Invalid email or password' });
  }
};

exports.list = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.password = await bcrypt.hash(password, 10);
    const updated = await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated', user: updated });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

// Toggle user status (Admin only)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If status field doesn't exist, set it to active first
    if (!user.status) {
      user.status = 'active';
    }
    
    // Toggle status between active and inactive
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();
    
    res.json({ 
      message: `User status updated to ${user.status}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Toggle status error:', err);
    return res.status(500).json({ message: err.message || 'Failed to toggle user status' });
  }
};

// Deactivate user (Admin only)
exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot deactivate admin users' });
    }
    user.status = 'inactive';
    await user.save();
    res.json({ message: 'User deactivated', user: { id: user._id, status: user.status } });
  } catch (err) {
    next(err);
  }
};

// Activate user (Admin only)
exports.activateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.status = 'active';
    await user.save();
    res.json({ message: 'User activated', user: { id: user._id, status: user.status } });
  } catch (err) {
    next(err);
  }
};

// Admin list: DO NOT expose passwords or plainPassword
exports.adminList = async (req, res, next) => {
  try {
    const users = await User.find().select('-password'); // Exclude password field
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// Reset password for old accounts or testing
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    // Hash new password with bcrypt
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.status = 'active'; // Ensure user is active
    await user.save();
    
    res.json({ 
      message: 'Password reset successfully',
      user: { id: user._id, email: user.email, status: user.status }
    });
  } catch (err) {
    next(err);
  }
};

// Migration: Add status field to all users
exports.migrateUserStatus = async (req, res, next) => {
  try {
    const result = await User.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );
    
    res.json({ 
      message: 'Migration completed',
      updated: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};
