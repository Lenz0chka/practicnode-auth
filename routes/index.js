const express = require('express');
const path = require('path');
const { User, Role, sequelize } = require('../db');
const bcrypt = require("bcrypt");
const { isAuthorized, hasRole } = require('../auth');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/profile');
  } else {
    res.redirect('/login');
  }
});

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register',
    async (req,
           res) => {
  const { username, password } = req.body;
  try {
    const role = await Role.findOne({ where: { name: 'Пользователь' } });
    if (!role) {
      return res.status(400).send('Role not found');
    }
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.send('Пользователь с таким именем уже существует');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword, roleId: role.id });
    res.redirect('/login');
  } catch (err) {
    res.status(400).send('Ошибка регистрации: ' + err.message);
  }
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post(
    '/login',
    async (req,
     res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({where: {username}, include: Role});
    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        req.session.user =
            { id: user.id, username: username, password: password, role: user.Role.name };
        if (user.Role.name === 'Администратор') {
          res.redirect('/admin/panel');
        } else {
          res.redirect('/profile');
        }
      }
    } else {
      res.status(401).send('Неверное имя пользователя или пароль');
    }
  }
  catch (err) {
    res.status(500).send('Ошибка сервера: ' + err.message);
  }
});

router.get(
    '/profile', isAuthorized,
    hasRole('Пользователь'),
    (req, res) => {
  res.render('profile');
});

router.post('/profileUpdate', isAuthorized, hasRole('Пользователь'), async (req, res) => {
  const { username, password } = req.body;
  const currentUser = req.session.user;

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser && existingUser.id !== currentUser.id) {
    return res.send('Пользователь с таким именем уже существует');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.update({ username, password: hashedPassword }, { where: { id: currentUser.id } });
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
