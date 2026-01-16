export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};

export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('pt-BR');
};

export const calculateNextPaymentDue = (lastPayment: string): string => {
  const date = new Date(lastPayment);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
};