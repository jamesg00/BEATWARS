// src/server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// --- Config ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/midigen';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_change_me_in_prod';

// --- DB ---
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // hashed
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// --- Helpers ---
function signToken(user) {
  return jwt.sign({ sub: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// --- Routes ---
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name || '', email, password: hash });

    const token = signToken(user);
    return res.status(201).json({ message: 'Registered', token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid email or password' });

    const token = signToken(user);
    return res.json({ message: 'Login successful', token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    return res.status(500).json({ message: 'Server error', error: e.message });
  }
});

app.get('/api/me', auth, async (req, res) => {
  const user = await User.findById(req.user.sub).select('_id name email');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
