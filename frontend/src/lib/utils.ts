export function formatPriceUZS(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  const formatted = new Intl.NumberFormat('ru-RU').format(Math.round(value));
  return `${formatted} so'm`;
}

export function formatPriceShort(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value === 0) return '0';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mlrd`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mln`;
  return `${(value / 1_000).toFixed(0)} ming`;
}

const regionCenters: Record<string, [number, number]> = {
  'Ташкент': [41.2995, 69.2401],
  'Самарканд': [39.627, 66.975],
  'Бухара': [39.768, 64.421],
  'Андижан': [40.782, 72.344],
  'Фергана': [40.384, 71.784],
  'Наманган': [40.998, 71.6726],
  'Карши': [38.861, 65.789],
  'Нукус': [42.46, 59.616],
  'Ургенч': [41.55, 60.633],
  'Навои': [40.103, 65.373],
  'Джизак': [39.774, 67.83],
  'Гулистан': [40.49, 68.781],
  'Термез': [37.224, 67.276],
  'Коканд': [40.528, 70.942],
  'Ангрен': [41.017, 70.143],
  'Чирчик': [41.468, 69.575],
  'Бекабад': [40.22, 69.123],
  'Алмалык': [40.846, 69.598],
  'Янгиюль': [41.117, 69.05],
  'Зангиата': [41.18, 69.14],
  'Назарбек': [41.18, 69.14],
  'Паркент': [41.294, 70.998],
  'Ахангаран': [40.966, 69.642],
  'Нурафшон': [41.17, 69.24],
  'Мирабад': [41.3, 69.28],
  'Яшнабад': [41.29, 69.33],
  'Юнусабад': [41.37, 69.285],
  'Шайхантахур': [41.32, 69.205],
  'Чиланзар': [41.27, 69.205],
  'Яккасарай': [41.295, 69.255],
  'Учтепа': [41.32, 69.165],
  'Бектемир': [41.22, 69.33],
  'Сергели': [41.21, 69.205],
  'Алмазар': [41.34, 69.245],
  'Мирзо-Улугбек': [41.305, 69.33],
  'Кибрай': [41.32, 69.47],
  'Бешкент': [38.6, 66.9],
  'Коксарай': [40.5, 71.0],
  'Эшангузар': [40.0, 69.0],
  'Чарвак': [41.58, 69.75],
};

export function resolveRegionCoords(name?: string): [number, number] {
  if (!name) return [41.2995, 69.2401];
  const key = name.split(',')[0].trim();
  const firstWord = key.split(' ')[0];
  const base = regionCenters[key] || regionCenters[firstWord] || [41.2995, 69.2401];
  const jitter = 0.025;
  return [base[0] + (Math.random() - 0.5) * jitter, base[1] + (Math.random() - 0.5) * jitter];
}
