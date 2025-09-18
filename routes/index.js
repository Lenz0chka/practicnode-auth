const express = require('express');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require("bcrypt");

const router = express.Router();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite'
});

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
})

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roleId: {
    type: DataTypes.INTEGER,
    references: {
      model: Role,
      key: 'id'
    },
    allowNull: false
  }
});

Role.hasMany(User, {foreignKey: 'roleId'} );
User.belongsTo(Role, {foreignKey: 'roleId'} );

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Соединение с БД установлено.');
    await sequelize.sync();

    if(!await Role.findOne({ where: { name: 'Администратор'}})){
      await Role.create({ name: 'Администратор'});
    }
    if(!await Role.findOne({ where: { name: 'Пользователь'}})){
      await Role.create({ name: 'Пользователь'});
    }
  } catch (err) {
    console.error('Ошибка подключения к БД:', err);
  }
})();

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

router.post('/register',
    async (req,
           res) => {
  const { username, password, roleId } = req.body;
  try {
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(400).send('Role not found');
    }
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.send('Пользователь с таким именем уже существует');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword, roleId: roleId });
    res.redirect('/login');
  } catch (err) {
    res.status(400).send('Ошибка регистрации: ' + err.message);
  }
});

router.get('/login',
    (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

router.post(
    '/login',
    async
    (req,
     res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({where: {username}, include: Role});
    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        req.session.user =
            { id: user.id, username: username, password: password, role: user.Role.name };
        res.redirect('/profile');
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
  res.sendFile(path.join(__dirname, '../public/profile.html'));
});

router.get(
    '/admin', isAuthorized,
    hasRole('Администратор'),
    (req, res) => {
  res.sendFile(path.join(__dirname, '../public/adminpanel.html'));
})

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

function isAuthorized(req, res, next) {
  if (req.session.user) {
    next();
  }
  else{
    res.redirect('/login');
  }
}

function hasRole(roleName){
  return async (req, res, next) => {
    if(req.session.user){
      const user = await User.findByPk(
          req.session.user.id, { include: Role}
      );
      if(user && user.Role.name === roleName){
        next();
      }
      else{
        res.status(403).send('Access denied');
      }
    }else{
      res.redirect('/login');
    }
  }
}

module.exports = router;
