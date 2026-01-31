// Helper functions for apotik access control

export interface User {
  id: string;
  email: string;
  role: string | null;
  apotikIds?: string[];
  isSuperAdmin?: boolean;
}

/**
 * Get user's accessible apotik IDs
 * Returns all apotik IDs if user is super admin, otherwise returns assigned apotik IDs
 */
export function getUserApotikIds(user: User | null): string[] {
  if (!user) return [];
  
  if (user.isSuperAdmin) {
    // Super admin can access all apotiks
    // Return empty array to indicate "all" - caller should handle this
    return [];
  }
  
  return user.apotikIds || [];
}

/**
 * Check if user can access a specific apotik
 */
export function canAccessApotik(user: User | null, apotikId: string): boolean {
  if (!user) return false;
  
  // Super admin can access all apotiks
  if (user.isSuperAdmin) {
    return true;
  }
  
  // Check if apotikId is in user's apotikIds array
  return user.apotikIds?.includes(apotikId) || false;
}

/**
 * Filter data by apotik access
 * Returns all data if user is super admin, otherwise filters by accessible apotik IDs
 */
export function filterByApotikAccess<T extends { apotikId: string }>(
  data: T[],
  user: User | null
): T[] {
  if (!user) return [];
  
  // Super admin can see all data
  if (user.isSuperAdmin) {
    return data;
  }
  
  // Filter by accessible apotik IDs
  const accessibleIds = getUserApotikIds(user);
  if (accessibleIds.length === 0) {
    return []; // User has no apotik access
  }
  
  return data.filter((item) => accessibleIds.includes(item.apotikId));
}

/**
 * Check if user has access to any apotik
 */
export function hasApotikAccess(user: User | null): boolean {
  if (!user) return false;
  
  if (user.isSuperAdmin) {
    return true;
  }
  
  return (user.apotikIds?.length || 0) > 0;
}
