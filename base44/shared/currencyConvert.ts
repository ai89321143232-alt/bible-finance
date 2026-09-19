export function createCurrencyTools(owner: any) {
  const profileCurrency = owner?.currency || owner?.data?.currency || 'RUB';
  const rates = owner?.exchange_rates || owner?.data?.exchange_rates || {};

  const convert = (amount: number, from?: string, to = profileCurrency) => {
    const source = from || profileCurrency;
    if (source === to) return amount;
    const sourceRate = Number(rates[source]);
    if (!Number.isFinite(sourceRate) || sourceRate <= 0) return null;
    const inProfile = amount * sourceRate;
    if (to === profileCurrency) return inProfile;
    const targetRate = Number(rates[to]);
    if (!Number.isFinite(targetRate) || targetRate <= 0) return null;
    return inProfile / targetRate;
  };

  const format = (amount: number, currency = profileCurrency) =>
    `${Number(amount || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${currency}`;

  const summarize = (items: Array<{ amount?: number; currency?: string }>) => {
    const grouped: Record<string, number> = {};
    for (const item of items) {
      const currency = item.currency || profileCurrency;
      grouped[currency] = (grouped[currency] || 0) + Number(item.amount || 0);
    }

    let total = 0;
    const missing: string[] = [];
    const lines = Object.entries(grouped).map(([currency, amount]) => {
      const converted = convert(amount, currency);
      if (converted == null) {
        missing.push(currency);
        return `- ${currency}: ${format(amount, currency)} — курс не задан`;
      }
      total += converted;
      return `- ${currency}: ${format(amount, currency)} → ${format(converted)}`;
    });

    return { lines, total, missing };
  };

  return { profileCurrency, convert, format, summarize };
}