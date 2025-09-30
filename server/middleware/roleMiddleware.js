module.exports = (requiredRoleOrRoles) => (req, res, next) => {
  const userRole = req.user?.role;
  if (!userRole) {
    return res.status(401).json({ message: 'No user role found' });
  }

  const requiredRoles = Array.isArray(requiredRoleOrRoles)
    ? requiredRoleOrRoles
    : [requiredRoleOrRoles];

  const normalize = (role) => (role === 'pharmacist' ? 'shop' : role);

  const normalizedUserRole = normalize(userRole);
  const isAllowed = requiredRoles.map(normalize).includes(normalizedUserRole);

  if (!isAllowed) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};