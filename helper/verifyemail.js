import nodemailer from "nodemailer";
import config from "./mailer.js";
export const sendVerificationEmail = async (userId, name, email, token) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
    const mailOptions = {
      from: config.user,
      to: email,
      subject: "Reset Password - JJK ECOMMERCE",
      html: `
              <html>
                <head>
                  <style>
                    @import url('https://fonts.googleapis.com/css?family=Roboto:400,500&display=swap');
                  
                    body {
                      font-family: 'Roboto', Arial, sans-serif;
                      background-color: #f4f4f4;
                    }
                    .container {
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 20px;
                      background-color: #ffffff;
                      border: 1px solid #e0e0e0;
                      border-radius: 4px;
                    }
                    .header {
                      text-align: center;
                      margin-bottom: 20px;
                    }
                    .header h2 {
                      color: #333333;
                    }
                    .content {
                      margin-top: 20px;
                      padding: 20px;
                      background-color: #f8f8f8;
                      border-radius: 4px;
                    }
                    .button {
                      display: inline-block;
                      background-color: #4CAF50;
                      color: #ffffff;
                      padding: 10px 20px;
                      text-align: center;
                      text-decoration: none;
                      border-radius: 4px;
                      transition: background-color 0.3s ease;
                    }
                    .button:hover {
                      background-color: #45a049;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h2>Reset Password - JJK ECOMMERCE</h2>
                    </div>
                    <div class="content">
                      <p>Hi ${name},</p>
                      <p>Please click the link below to reset your password:</p>
                      <p>
                        <a class="button" href="${process.env.VERIFICATION_LINK}?token=${token}&userId=${userId}">Reset Password</a>
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `,
    };
    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          reject(error);
        } else {
          resolve(info);
        }
      });
    });
  } catch (e) {
    console.log(e);
  }
};

//forgot password email

export const sendResetEmail = async (userId, name, email, token) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
    const mailOptions = {
      from: config.user,
      to: email,
      subject: "Reset Password - FirstJOB",
      html: `
              <html>
                <head>
                  <style>
                    @import url('https://fonts.googleapis.com/css?family=Roboto:400,500&display=swap');
                  
                    body {
                      font-family: 'Roboto', Arial, sans-serif;
                      background-color: #f4f4f4;
                    }
                    .container {
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 20px;
                      background-color: #ffffff;
                      border: 1px solid #e0e0e0;
                      border-radius: 4px;
                    }
                    .header {
                      text-align: center;
                      margin-bottom: 20px;
                    }
                    .header h2 {
                      color: #333333;
                    }
                    .content {
                      margin-top: 20px;
                      padding: 20px;
                      background-color: #f8f8f8;
                      border-radius: 4px;
                    }
                    .button {
                      display: inline-block;
                      background-color: #4CAF50;
                      color: #ffffff;
                      padding: 10px 20px;
                      text-align: center;
                      text-decoration: none;
                      border-radius: 4px;
                      transition: background-color 0.3s ease;
                    }
                    .button:hover {
                      background-color: #45a049;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h2>Reset Password - JJK ECOMMERCE</h2>
                    </div>
                    <div class="content">
                      <p>Hi ${name},</p>
                      <p>Please click the link below to reset your password:</p>
                      <p>
                        <a class="button" href="${process.env.PASSWORD_RESET_LINK}?token=${token}">Reset Password</a>
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `,
    };
    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          reject(error);
        } else {
          resolve(info);
        }
      });
    });
  } catch (e) {
    console.log(e);
  }
};
