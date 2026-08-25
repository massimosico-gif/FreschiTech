/** Formattazione numerica in convenzione italiana (virgola decimale). */
export const formatNumber = (num: number | null | undefined): string => {
  // Intl formatta null/undefined come "NaN": meglio uno zero esplicito.
  const value = typeof num === 'number' && Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/** Importo in euro, con simbolo di valuta. */
export const formatEuro = (value: number | null | undefined): string => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};
