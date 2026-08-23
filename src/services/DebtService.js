// ============================================================
// DebtService — финансовая логика планирования выхода из долгов
// ============================================================
// Поддерживает:
//   - Аннуитетные платежи (формула РФ: P = S * r / (1 - (1+r)^-n))
//   - Дифференцированные платежи
//   - Стратегии "Снежный ком" (Snowball) и "Лавина" (Avalanche)
//   - Прогноз погашения (month-by-month simulation)
//   - Расчёт переплаты и экономии при досрочном погашении
// ============================================================

// Месячная процентная ставка из годовой
export function monthlyRate(annualRatePercent) {
  return (annualRatePercent / 100) / 12;
}

// Расчёт минимального платежа: если задан monthly_payment — берём его,
// иначе считаем по min_payment_percent (для кредитных карт, по умолчанию 3%)
export function calcMinPayment(debt) {
  const balance = debt.remaining_amount || 0;
  const explicit = Number(debt.monthly_payment) || 0;
  if (explicit > 0) return explicit;
  const percent = Number(debt.min_payment_percent) || 3;
  return Math.max(balance * (percent / 100), 500);
}

// Аннуитетный платёж: сумма, ставка % годовых, срок в месяцах
export function calcAnnuityPayment(principal, annualRatePercent, months) {
  if (months <= 0) return 0;
  const r = monthlyRate(annualRatePercent);
  if (r === 0) return principal / months;
  return principal * r / (1 - Math.pow(1 + r, -months));
}

// Остаток срока по аннуитету, зная остаток долга и платёж
export function calcRemainingMonths(remaining, monthlyPayment, annualRatePercent) {
  if (monthlyPayment <= 0) return Infinity;
  const r = monthlyRate(annualRatePercent);
  if (r === 0) return Math.ceil(remaining / monthlyPayment);
  // remaining = payment * (1 - (1+r)^-n) / r  →  n = -log(1 - remaining*r/payment) / log(1+r)
  const ratio = remaining * r / monthlyPayment;
  if (ratio >= 1) return Infinity; // платёж не покрывает проценты
  return Math.ceil(-Math.log(1 - ratio) / Math.log(1 + r));
}

// Переплата (проценты) при текущих условиях до полного погашения
export function calcOverpayment(remaining, monthlyPayment, annualRatePercent) {
  const months = calcRemainingMonths(remaining, monthlyPayment, annualRatePercent);
  if (months === Infinity) return Infinity;
  return Math.max(0, monthlyPayment * months - remaining);
}

// Симуляция погашения всех долгов по выбранной стратегии
// Возвращает массив помесячных прогнозов
//
// debts: [{ id, name, remaining_amount, interest_rate, monthly_payment, min_payment_percent, type, status, grace_period_end }]
// extraPayment: дополнительная сумма, которую пользователь готов платить сверху
// strategy: "snowball" | "avalanche"
export function simulatePayoff(debts, extraPayment = 0, strategy = "avalanche") {
  if (!debts || debts.length === 0) return [];

  const now = new Date();

  // Клонируем долги в рабочий массив
  let working = debts.map(d => ({
    id: d.id,
    name: d.name,
    balance: d.remaining_amount || 0,
    rate: d.interest_rate || 0,
    minPayment: calcMinPayment(d),
    type: d.type,
    status: d.status,
    gracePeriodEnd: d.grace_period_end ? new Date(d.grace_period_end) : null,
  }));

  const totalDebt = working.reduce((s, d) => s + d.balance, 0);
  const totalMinPayments = working.reduce((s, d) => s + d.minPayment, 0);
  const monthlyBudget = totalMinPayments + extraPayment;

  const timeline = [];
  let month = 0;
  const maxMonths = 600; // 50 лет — защита от бесконечного цикла

  while (working.some(d => d.balance > 0.01) && month < maxMonths) {
    month++;
    const monthData = {
      month,
      totalDebt: 0,
      payments: [],
    };

    // 1. Начисляем проценты за месяц на каждый долг (кроме льготного периода)
    const monthDate = addMonths(now, month);
    working.forEach(d => {
      if (d.balance > 0) {
        // В льготном периоде проценты не начисляются
        const inGrace = d.status === 'in_grace' ||
          (d.gracePeriodEnd && monthDate <= d.gracePeriodEnd);
        if (!inGrace) {
          const interest = d.balance * monthlyRate(d.rate);
          d.balance += interest;
        }
      }
    });

    // 2. Платим минимальные платежи по всем долгам
    let availableExtra = extraPayment;
    working.forEach(d => {
      if (d.balance > 0) {
        const payment = Math.min(d.minPayment, d.balance);
        d.balance -= payment;
        monthData.payments.push({
          id: d.id,
          name: d.name,
          payment,
          balanceAfter: Math.max(0, d.balance),
        });
      }
    });

    // 3. Дополнительный платёж направляем на приоритетный долг
    if (availableExtra > 0) {
      // Сортируем долги по стратегии
      const activeDebts = working
        .filter(d => d.balance > 0)
        .sort((a, b) => {
          if (strategy === "snowball") {
            // Снежный ком: сначала наименьший остаток
            return a.balance - b.balance;
          } else {
            // Лавина: сначала наибольшая ставка
            return b.rate - a.rate;
          }
        });

      // Направляем всю доп. сумму на первый приоритетный долг
      if (activeDebts.length > 0) {
        const target = activeDebts[0];
        const payment = Math.min(availableExtra, target.balance);
        target.balance -= payment;
        // Обновляем запись в payments
        const existing = monthData.payments.find(p => p.id === target.id);
        if (existing) {
          existing.payment += payment;
          existing.balanceAfter = Math.max(0, target.balance);
        } else {
          monthData.payments.push({
            id: target.id,
            name: target.name,
            payment,
            balanceAfter: Math.max(0, target.balance),
          });
        }
      }
    }

    monthData.totalDebt = working.reduce((s, d) => s + Math.max(0, d.balance), 0);
    timeline.push(monthData);
  }

  // Сводка
  const totalPaid = timeline.reduce((s, m) =>
    s + m.payments.reduce((ms, p) => ms + p.payment, 0), 0
  );
  const totalInterest = totalPaid - totalDebt;

  return {
    timeline,
    summary: {
      totalDebt,
      totalPaid,
      totalInterest,
      monthsToPayoff: month,
      payoffDate: addMonths(new Date(), month),
      monthlyBudget,
      strategy,
    },
  };
}

// Сравнение стратегий — показывает экономию лавины над снежным комом
export function compareStrategies(debts, extraPayment = 0) {
  const snowball = simulatePayoff(debts, extraPayment, "snowball");
  const avalanche = simulatePayoff(debts, extraPayment, "avalanche");

  const savings = snowball.summary.totalInterest - avalanche.summary.totalInterest;
  const monthsSaved = snowball.summary.monthsToPayoff - avalanche.summary.monthsToPayoff;

  return {
    snowball: snowball.summary,
    avalanche: avalanche.summary,
    savings,
    monthsSaved,
  };
}

// Добавить месяцы к дате
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Форматирование валюты (по умолчанию RUB, можно передать код валюты и язык)
export function formatDebtCurrency(amount, currency = 'RUB', language = 'ru') {
  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'RUB',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Оценка долговой нагрузки (PTI — Payment to Income)
// В РФ ЦБ считает нормой PTI <= 30-40%
export function assessDebtBurden(totalMonthlyPayments, monthlyIncome) {
  if (monthlyIncome <= 0) return { ratio: 0, level: 'unknown' };
  const ratio = (totalMonthlyPayments / monthlyIncome) * 100;
  let level;
  if (ratio <= 15) level = 'low';
  else if (ratio <= 30) level = 'moderate';
  else if (ratio <= 50) level = 'high';
  else level = 'critical';
  return { ratio, level };
}