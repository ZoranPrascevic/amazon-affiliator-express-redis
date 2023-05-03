const express = require("express");
const router = express.Router();
const fb = require("./../controllers/firebase.controller");
const { verifyEmail } = require("./../utils/auth.utils");

const awaitHandlerFactory = require("../middleware/awaitHandlerFactory.middleware");

const { createUserSchema } = require("../middleware/validators/userValidator.middleware");



router.post("/signup", createUserSchema, fb.createUser);

router.get("/confirm_email/:hash", verifyEmail);

module.exports = router;

// const userController = require("../controllers/user.controller");

// const auth = require('../middleware/auth.middleware');
// const Role = require('../utils/userRoles.utils');

// router.get('/', auth(), awaitHandlerFactory(userController.getAllUsers));
// router.get('/id/:id', auth(), awaitHandlerFactory(userController.getUserById));
// router.get('/username/:username', auth(), awaitHandlerFactory(userController.getUserByuserName));
// router.get('/whoami', auth(), awaitHandlerFactory(userController.getCurrentUser));
// router.post('/', createUserSchema, awaitHandlerFactory(userController.createUser));
// router.patch('/id/:id', auth(Role.Admin), updateUserSchema, awaitHandlerFactory(userController.updateUser));
// router.delete('/id/:id', auth(Role.Admin), awaitHandlerFactory(userController.deleteUser));
// router.post('/login', userController.userLogin);