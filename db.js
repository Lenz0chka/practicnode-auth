const { Sequelize, DataTypes } = require('sequelize');

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

module.exports = {
    sequelize,
    Role,
    User
}