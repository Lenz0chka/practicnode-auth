const express = require('express');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const router = express.Router();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite'
});

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Соединение с БД установлено.');
    await sequelize.sync();
  } catch (err) {
    console.error('Ошибка подключения к БД:', err);
  }
})();

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

router.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/profile');
  } else {
    res.redirect('/login');
  }
});

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    return res.send('Пользователь с таким именем уже существует');
  }

  await User.create({ username, password });
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ where: { username, password } });
  if (user) {
    req.session.user = user.toJSON();
    res.redirect('/profile');
  } else {
    res.send('Неверное имя пользователя или пароль');
  }
});

router.get('/profile', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/profile.html'));
});

router.post('/profileUpdate', isAuthenticated, async (req, res) => {
  const { username, password } = req.body;
  const currentUser = req.session.user;

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser && existingUser.id !== currentUser.id) {
    return res.send('Пользователь с таким именем уже существует');
  }

  await User.update({ username, password }, { where: { id: currentUser.id } });
  const updatedUser = await User.findByPk(currentUser.id);
  req.session.user = updatedUser.toJSON();

  res.redirect('/profile');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
