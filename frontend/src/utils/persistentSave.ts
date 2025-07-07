export function setFieldSaved(activityId: string, userId: string, field: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`saved_${activityId}_${userId}_${field}`, '1');
  }
}

export function isFieldSaved(activityId: string, userId: string, field: string) {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`saved_${activityId}_${userId}_${field}`) === '1';
  }
  return false;
}

export function clearFieldSaved(activityId: string, userId: string, field: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`saved_${activityId}_${userId}_${field}`);
  }
} 