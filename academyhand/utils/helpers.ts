export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateNextPaymentDue = (lastPayment: string): string => {
  const date = new Date(lastPayment);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
};

export const sanitizeInput = (input: string): string => {
  return input.replace(/[<>"']/g, '');
};

export const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};