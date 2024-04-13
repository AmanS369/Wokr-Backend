import express from 'express';
import { emailVerification, loginController, registerController, resetPassword, resetPasswordVerify } from '../Controller/authController.js';


// import { requireSign,isAdmin } from '../middlewares/authMiddle.js';


const router =express.Router();
router.post("/register",registerController)
router.post('/login',loginController);
router.get('/verify',emailVerification)
//to send the reset passowrd link 
router.post('/reset',resetPassword)
//to verify restw password link 
router.post('/reset_password/:token',resetPasswordVerify)



export default router