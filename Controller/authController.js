import express, { text } from "express";
import JWT from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import {
  sendResetEmail,
  sendVerificationEmail,
} from "../helper/verifyemail.js";
import User from "../Database/Model/userModel.js";
import Token from "../Database/token.js";
import { hash, compare } from "../helper/authHelper.js";
import generateTokenId from "../helper/uniqueToken.js";

export const registerController = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    console.log(req.body);
    const ex_user_by_email = await User.findOne({ email });
    const ex_user_by_phone = await User.findOne({ phone });
    if (ex_user_by_email) {
      console.log("EMAIL EXISTS");
      if (ex_user_by_email.isVerified) {
        res.status(500).json({
          success: false,
          message: "Email aleardy exist",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Email exist but not verified",
        });
      }
    } else if (ex_user_by_phone) {
      res.status(500).json({
        success: false,
        message: "Phone number aleardy exist",
      });
    } else {
      const hashpass = await hash(password);
      const verificationToken = await JWT.sign(
        { email },
        process.env.SECRET_KEY,
        { expiresIn: "7d" }
      );
      const user = new User({ name, email, phone, password: hashpass });
      user.save();
      try {
        await sendVerificationEmail(user._id, name, email, verificationToken);
        res.status(200).json({
          message: "User registered. Check your email for verification.",
        });
      } catch (emailError) {
        console.error(emailError);
        res.status(500).json({ message: "Error sending verification email" });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Something went worong",
    });
  }
};

export const emailVerification = async (req, res) => {
  const { token, userId } = req.query;
  try {
    const { email } = JWT.verify(token, process.env.SECRET_KEY);
    const user = await User.findOne({ _id: userId, email: email });
    if (user) {
      if (user.isVerified) {
        res.status(200).json({
          success: true,
          message: "Email already verified successfully",
        });
      } else {
        user.isVerified = true;
        user.verificationToken = "";
        await user.save();

        res
          .status(200)
          .json({ success: true, message: "Email verified successfully" });
      }
    } else {
      res.status(500).json({
        success: false,
        message: "something went wrong",
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "something went wrong",
    });
  }
};

//forget password
export const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user && user.isVerified) {
      const tokenIdentifier = generateTokenId();
      const token = JWT.sign(
        { email, jti: tokenIdentifier },
        process.env.SECRET_KEY,
        {
          expiresIn: "1d",
        }
      );
      await Token.create({ tokenId: tokenIdentifier });
      sendResetEmail(user._id, user.name, email, token);
      res.status(200).send({
        success: true,
        message: "Reset Password Mail Send",
      });
    } else {
      res.status(500).send({
        success: true,
        message: "Email does not exist or not verified",
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({
      message: "Error in Login",
    });
  }
};

//reset password verify
export const resetPasswordVerify = async (req, res) => {
  try {
    const { token } = req.params;
    console.log("this is token");
    const { password } = req.body;
    const hashpass = await hash(password);
    const { email, jti } = JWT.verify(token, process.env.SECRET_KEY);
    const tokenExists = await Token.findOneAndDelete({ tokenId: jti });
    const user = await User.findOne({ email: email });
    if (tokenExists && user) {
      user.password = hashpass;
      await user.save();
      res.status(200).send({
        success: true,
        message: "Password Changed",
      });
    } else {
      console.log("no user");
      res.status(500).send({
        success: false,
        message: "User does not exist",
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({
      success: false,
      message: "Something went wrong try again",
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user) {
      const match = await compare(password, user.password);
      if (match) {
        const token = await JWT.sign(
          { _id: user._id },
          process.env.SECRET_KEY,
          { expiresIn: "7d" }
        );
        res.status(200).send({
          message: `Welcome ${user.name} `,
          success: true,

          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
          token: token,
        });
      } else {
        console.log("wrong password");
        res.status(500).send({ success: false, message: "wrong password " });
      }
    } else {
      console.log("wrong ddpass");
      res.status(500).send({ success: false, message: "no user exist " });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({
      message: "Error in Login",
    });
  }
};
