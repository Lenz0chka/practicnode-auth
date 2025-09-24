const {User, Role} = require("./db");

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

module.exports = { isAuthorized, hasRole };