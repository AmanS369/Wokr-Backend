import JWT from "jsonwebtoken";

export const requireSign = async (req, res, next) => {
  try {
    const decode = JWT.verify(
      req.headers.authorization,
      process.env.SECRET_KEY
    );

    req.user = decode;
    next();
  } catch (e) {
    console.log(e);
    res.status(500).send({
      success: "false",
      message: "Restricted access",
    });
  }
};
