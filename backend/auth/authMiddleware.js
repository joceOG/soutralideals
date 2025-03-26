import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "Accès non autorisé. Token manquant." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.tokens.includes(token)) {
            return res.status(401).json({ message: "Token invalide ou expiré." });
        }

        req.user = user; 
        req.token = token;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Authentification échouée.", error: error.message });
    }
};

export default authMiddleware;
