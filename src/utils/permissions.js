const configManager = require('./configManager');

function hasRole(member, roleIds = []) {
  return roleIds.some((id) => member.roles.cache.has(id));
}

function isAllowedUser(userId, allowedUsers = []) {
  return allowedUsers.includes(userId);
}

function isAuthorized(member) {
  const perms = configManager.get('permissions') || {};
  const allowedRoles = perms.allowedRoles || [];
  const allowedUsers = perms.allowedUsers || [];
  if (allowedRoles.length === 0 && allowedUsers.length === 0) {
    return true;
  }
  return isAllowedUser(member.id, allowedUsers) || hasRole(member, allowedRoles);
}

module.exports = {
  isAuthorized,
  hasRole,
  isAllowedUser
};
