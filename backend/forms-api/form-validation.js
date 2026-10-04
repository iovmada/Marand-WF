const text = (value) => String(value ?? '').trim();
const present = (value) => Boolean(text(value)) && text(value).toLowerCase() !== 'nespecificat';

export const validateFormPayload = (payload = {}, { quote = false } = {}) => {
  const required = ['name', 'email', 'details', ...(quote ? ['category'] : [])];
  if (required.some((field) => !present(payload[field]))) {
    return 'Completează numele, emailul și detaliile proiectului' + (quote ? ', apoi alege categoria produsului.' : '.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(payload.email))) {
    return 'Introdu o adresă de email validă.';
  }
  return null;
};
