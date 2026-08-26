// middleware/checkRole.js
const checkRole = (allowedRoles) => (req, res, next) => {
  console.log(`Checking role. Allowed: [${allowedRoles}], User role: "${req.user?.role}"`);
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    console.log(`❌ Role check failed. User role "${req.user?.role}" not in allowed roles.`);
    return res.status(403).json({ message: "You don't have permission for this action" });
  }
  next();
};

module.exports = checkRole;