/* eslint-disable */
// Banco de peças do infográfico (viewBox 100x100). Cada peça é um objeto reconhecível, desenhado em
// colmeia com os tons do app (ver `docs/infografico.md`). O catálogo que a IA vê fica em
// `shared/infographic-pieces.ts`; um teste garante que as chaves são as mesmas.

export type Tone = 'b' | 'B' | 's' | 'n' | 'N' | 'd' | 'w';

export type Shape =
  | ['r', number, number, number, number, Tone, number]
  | ['c', number, number, number, Tone]
  | ['e', number, number, number, number, Tone]
  | ['g', number[], Tone]
  | ['a', string, Tone]
  | ['l', number, number, number, number, Tone, number]
  | ['k', string, Tone, number]
  | ['o', number, number, number, Tone, number]
  | ['q', number, number, number, number, Tone, number]
  | ['T', number, number, number, Shape[]];

export interface Piece {
  key: string;
  theme: string;
  name: string;
  tags: string;
  shapes: Shape[];
  /** `false`: peça solta, sem a base hexagonal (as genéricas). */
  ped?: boolean;
}

const r = (x: number, y: number, w: number, h: number, t: Tone = 'n', rx = 0): Shape => [
  'r',
  x,
  y,
  w,
  h,
  t,
  rx,
];
const c = (x: number, y: number, R: number, t: Tone = 'n'): Shape => ['c', x, y, R, t];
const e = (x: number, y: number, rx: number, ry: number, t: Tone = 'n'): Shape => [
  'e',
  x,
  y,
  rx,
  ry,
  t,
];
const g = (pts: number[], t: Tone = 'n'): Shape => ['g', pts, t];
const a = (d: string, t: Tone = 'n'): Shape => ['a', d, t];
const l = (x1: number, y1: number, x2: number, y2: number, t: Tone = 'd', w = 3): Shape => [
  'l',
  x1,
  y1,
  x2,
  y2,
  t,
  w,
];
const k = (d: string, t: Tone = 'd', w = 3): Shape => ['k', d, t, w];
const o = (x: number, y: number, R: number, t: Tone = 'd', w = 3): Shape => ['o', x, y, R, t, w];
const q = (x: number, y: number, rx: number, ry: number, t: Tone = 'd', w = 3): Shape => [
  'q',
  x,
  y,
  rx,
  ry,
  t,
  w,
];
const T = (rot: number, x: number, y: number, items: Shape[]): Shape => ['T', rot, x, y, items];
const rad = (d: number) => (d * Math.PI) / 180;
const poly = (x: number, y: number, R: number, n: number, t: Tone, rot = -90): Shape =>
  g(
    Array.from({ length: n }, (_, i) => [
      x + R * Math.cos(rad(rot + (i * 360) / n)),
      y + R * Math.sin(rad(rot + (i * 360) / n)),
    ])
      .flat()
      .map((v) => +v.toFixed(1)),
    t,
  );
const hx = (x: number, y: number, R: number, t: Tone): Shape => poly(x, y, R, 6, t);
const st = (x: number, y: number, R: number, ri: number, t: Tone): Shape =>
  g(
    Array.from({ length: 10 }, (_, i) => {
      const rr = i % 2 ? ri : R;
      return [x + rr * Math.cos(rad(-90 + i * 36)), y + rr * Math.sin(rad(-90 + i * 36))];
    })
      .flat()
      .map((v) => +v.toFixed(1)),
    t,
  );
const cyl = (x: number, top: number, w: number, h: number, tt: Tone, bt: Tone, ry = 6): Shape[] => [
  e(x, top + h, w / 2, ry, bt),
  r(x - w / 2, top, w, h, bt),
  e(x, top, w / 2, ry, tt),
];
const wedge = (x: number, y: number, R: number, a0: number, a1: number, t: Tone): Shape => {
  const p = (an: number) => [
    (x + R * Math.cos(rad(an))).toFixed(1),
    (y + R * Math.sin(rad(an))).toFixed(1),
  ];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);

  return a(`M${x} ${y}L${x0} ${y0}A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}Z`, t);
};
const cycleArrow = (x: number, y: number, R: number, a0: number, a1: number): Shape[] => {
  const pt = (an: number, rr: number) =>
    [x + rr * Math.cos(rad(an)), y + rr * Math.sin(rad(an))].map((v) => +v.toFixed(1));
  const [sx, sy] = pt(a0, R);
  const [ex, ey] = pt(a1, R);
  const [tx, ty] = pt(a1 + 16, R);
  const [ox, oy] = pt(a1, R + 8);
  const [ix, iy] = pt(a1, R - 8);

  return [
    k(`M${sx} ${sy}A${R} ${R} 0 0 1 ${ex} ${ey}`, 'b', 6.5),
    g([ox, oy, tx, ty, ix, iy], 'b'),
  ];
};
const HEART = 'M50 68C20 46 20 22 38 22C46 22 50 28 50 32C50 28 54 22 62 22C80 22 80 46 50 68Z';
const DROP = 'M50 10C50 10 24 40 24 54a26 26 0 0 0 52 0C76 40 50 10 50 10Z';

const PIECES_LIST: Piece[] = [];
const P = (
  theme: string,
  id: string,
  name: string,
  tags: string,
  shapes: Shape[],
  opt: { ped?: boolean } = {},
) => {
  PIECES_LIST.push({ key: theme + '.' + id, theme, name, tags, shapes, ...opt });
};

/* ---- Tecnologia ---- */
P('tecnologia', 'laptop', 'Notebook', 'computador código trabalho software', [
  r(20, 18, 60, 38, 'N', 4),
  r(25, 23, 50, 28, 'b', 2),
  l(32, 33, 42, 33, 'w', 3),
  l(32, 42, 58, 42, 'w', 3),
  r(12, 57, 76, 9, 'B', 3),
]);
P('tecnologia', 'chip', 'Chip', 'processador hardware cpu circuito', [
  r(28, 20, 44, 44, 'b', 5),
  r(38, 30, 24, 24, 'B', 3),
  hx(50, 42, 6, 's'),
  ...[34, 42, 50].flatMap((v) => [
    l(20, v + 0, 28, v, 'd', 3),
    l(72, v, 80, v, 'd', 3),
    l(v + 8, 12, v + 8, 20, 'd', 3),
    l(v + 8, 64, v + 8, 72, 'd', 3),
  ]),
]);
P('tecnologia', 'nuvem', 'Nuvem', 'cloud armazenamento upload internet', [
  c(36, 46, 13, 'b'),
  c(54, 36, 17, 'b'),
  c(70, 48, 12, 'b'),
  r(36, 46, 34, 14, 'b'),
  l(50, 54, 50, 40, 'w', 4),
  g([42, 44, 50, 33, 58, 44], 'w'),
]);
P('tecnologia', 'servidor', 'Servidor', 'datacenter rack hospedagem dados', [
  r(22, 12, 56, 17, 'N', 4),
  r(22, 32, 56, 17, 'N', 4),
  r(22, 52, 56, 17, 'N', 4),
  c(32, 20, 2.5, 'b'),
  c(32, 40, 2.5, 'b'),
  c(32, 60, 2.5, 'b'),
  l(44, 20, 68, 20, 'd', 2.5),
  l(44, 40, 68, 40, 'd', 2.5),
  l(44, 60, 68, 60, 'd', 2.5),
]);
P('tecnologia', 'codigo', 'Código', 'programação desenvolvimento software tags', [
  k('M36 26L14 46L36 66', 'b', 8),
  k('M64 26L86 46L64 66', 'b', 8),
  l(57, 24, 43, 68, 'd', 6),
]);
P('tecnologia', 'celular', 'Celular', 'smartphone app mobile', [
  r(30, 8, 40, 64, 'N', 7),
  r(34, 16, 32, 46, 'd', 3),
  r(38, 22, 24, 10, 'b', 2),
  r(38, 36, 24, 5, 's', 2),
  r(38, 45, 16, 5, 's', 2),
  c(50, 67, 2.5, 'w'),
]);
P('tecnologia', 'wifi', 'Wi-Fi', 'rede sinal conexão internet sem fio', [
  k('M14 36a50 50 0 0 1 72 0', 'b', 7),
  k('M26 48a34 34 0 0 1 48 0', 'b', 7),
  k('M37 60a18 18 0 0 1 26 0', 'b', 7),
  c(50, 70, 5.5, 'b'),
]);
P('tecnologia', 'robo', 'Robô de IA', 'inteligência artificial automação assistente bot', [
  l(50, 24, 50, 12, 'd', 3),
  c(50, 10, 4, 'b'),
  r(26, 24, 48, 40, 'N', 9),
  r(18, 38, 6, 14, 'B', 2),
  r(76, 38, 6, 14, 'B', 2),
  c(40, 42, 6.5, 'b'),
  c(60, 42, 6.5, 'b'),
  r(40, 54, 20, 4, 'd', 2),
]);
P('tecnologia', 'mouse', 'Mouse', 'periférico clique computador', [
  r(33, 10, 34, 58, 'N', 17),
  l(50, 10, 50, 34, 'd', 2.5),
  l(33, 34, 67, 34, 'd', 2.5),
  r(47, 17, 6, 11, 'b', 3),
]);
P('tecnologia', 'banco', 'Banco de dados', 'dados armazenamento sql registros', [
  ...cyl(50, 20, 50, 46, 's', 'b', 8),
  k('M25 36a25 8 0 0 0 50 0', 'B', 2.5),
  k('M25 50a25 8 0 0 0 50 0', 'B', 2.5),
]);

/* ---- Jogos ---- */
P('jogos', 'controle', 'Controle de videogame', 'console jogar gamer playstation', [
  r(14, 32, 72, 30, 'b', 15),
  c(27, 58, 12, 'b'),
  c(73, 58, 12, 'b'),
  r(24, 42, 18, 5, 'w', 2),
  r(30.5, 35.5, 5, 18, 'w', 2),
  c(66, 40, 4, 'B'),
  c(75, 47, 4, 'w'),
  c(57, 47, 4, 'w'),
  c(66, 54, 4, 'B'),
  r(45, 42, 10, 4, 'B', 2),
]);
P('jogos', 'joystick', 'Joystick de fliperama', 'arcade alavanca botão', [
  r(18, 54, 64, 18, 'N', 5),
  l(50, 54, 50, 28, 'd', 5),
  c(50, 22, 12, 'b'),
  c(46, 18, 3.5, 'w'),
  c(30, 63, 4.5, 's'),
  c(70, 63, 4.5, 'b'),
]);
P('jogos', 'dado', 'Dado', 'sorte aleatório tabuleiro azar', [
  g([50, 14, 80, 29, 50, 44, 20, 29], 's'),
  g([20, 29, 50, 44, 50, 74, 20, 59], 'b'),
  g([50, 44, 80, 29, 80, 59, 50, 74], 'B'),
  c(50, 29, 3, 'd'),
  c(30, 46, 2.8, 'w'),
  c(40, 62, 2.8, 'w'),
  c(58, 60, 2.8, 'w'),
  c(65, 52, 2.8, 'w'),
  c(72, 44, 2.8, 'w'),
]);
P('jogos', 'xadrez', 'Peão de xadrez', 'estratégia tabuleiro peça jogada', [
  c(50, 22, 11, 'b'),
  r(38, 34, 24, 6, 'B', 3),
  g([44, 40, 56, 40, 61, 62, 39, 62], 'b'),
  r(30, 62, 40, 9, 'B', 3),
]);
P('jogos', 'trofeu', 'Troféu', 'vitória campeão prêmio conquista', [
  k('M30 22Q12 20 16 34Q20 42 32 42', 'b', 5),
  k('M70 22Q88 20 84 34Q80 42 68 42', 'b', 5),
  a('M28 12H72V30a22 22 0 0 1-44 0Z', 'b'),
  r(34, 16, 5, 18, 'w', 2.5),
  r(46, 50, 8, 10, 'B'),
  r(32, 60, 36, 11, 'N', 3),
]);
P('jogos', 'cartucho', 'Cartucho', 'retrô fase jogo nostalgia', [
  r(26, 10, 48, 60, 'N', 5),
  r(33, 18, 34, 28, 'b', 3),
  g([46, 24, 46, 40, 58, 32], 'w'),
  r(33, 54, 34, 9, 'd', 2),
]);
P('jogos', 'headset', 'Headset gamer', 'fone online voz multiplayer', [
  k('M22 52V44a28 28 0 0 1 56 0v8', 'd', 6),
  r(14, 46, 16, 26, 'b', 6),
  r(70, 46, 16, 26, 'b', 6),
  k('M22 68q0 10 16 10', 'd', 3),
  c(40, 78, 3.5, 'b'),
]);
P('jogos', 'vida', 'Coração de vida', 'vidas fase energia game saúde', [
  a(HEART, 'b'),
  e(38, 32, 5, 3.5, 'w'),
]);
P('jogos', 'moeda', 'Moeda de jogo', 'pontos recompensa coletar bônus', [
  c(50, 42, 28, 'b'),
  c(50, 42, 21, 'B'),
  hx(50, 42, 12, 's'),
]);
P('jogos', 'invasor', 'Tela retrô', 'pixel arcade invader fliperama', [
  r(16, 12, 68, 52, 'N', 6),
  r(23, 19, 54, 38, 'd', 3),
  r(40, 28, 6, 6, 'b'),
  r(54, 28, 6, 6, 'b'),
  r(34, 34, 32, 6, 'b'),
  r(32, 40, 6, 6, 'b'),
  r(62, 40, 6, 6, 'b'),
  r(40, 46, 20, 5, 'b'),
  r(38, 64, 24, 6, 'N', 2),
]);

/* ---- Proteção ---- */
P('protecao', 'escudo', 'Escudo', 'proteção defesa segurança garantia', [
  a('M50 8L82 19V42C82 60 69 70 50 78C31 70 18 60 18 42V19Z', 'b'),
  a('M50 8L82 19V42C82 60 69 70 50 78Z', 'B'),
  k('M36 42l10 10 18-20', 'w', 6),
]);
P('protecao', 'cadeado', 'Cadeado', 'privacidade bloqueio senha trancado', [
  k('M35 38V28a15 15 0 0 1 30 0v10', 'd', 6),
  r(24, 36, 52, 36, 'b', 7),
  c(50, 50, 5.5, 'w'),
  r(47.5, 52, 5, 11, 'w', 2.5),
]);
P('protecao', 'chave', 'Chave', 'acesso permissão abrir credencial', [
  c(32, 40, 18, 'b'),
  c(32, 40, 7, 'w'),
  r(46, 36.5, 40, 8, 'b', 3),
  r(66, 44, 7, 11, 'b', 1),
  r(77, 44, 7, 8, 'b', 1),
]);
P('protecao', 'olho', 'Olho', 'vigilância monitoramento atenção visão', [
  a('M8 44Q50 6 92 44Q50 82 8 44Z', 'n'),
  c(50, 44, 17, 'b'),
  c(50, 44, 8, 'd'),
  c(45, 39, 3.5, 'w'),
]);
P('protecao', 'camera', 'Câmera de segurança', 'cftv vigilância monitorar vídeo', [
  r(14, 20, 56, 24, 'N', 6),
  r(64, 24, 14, 16, 'd', 3),
  c(71, 32, 3.5, 'b'),
  r(26, 44, 9, 12, 'B'),
  r(18, 56, 30, 6, 'B', 2),
  c(26, 28, 2.5, 'b'),
]);
P('protecao', 'digital', 'Impressão digital', 'biometria identidade autenticação', [
  k('M24 62V46a26 26 0 0 1 52 0v6', 'b', 4.5),
  k('M35 68V46a15 15 0 0 1 30 0v8', 'b', 4.5),
  k('M46 72V46a4 4 0 0 1 8 0v12', 'b', 4.5),
]);
P('protecao', 'senha', 'Campo de senha', 'login credencial autenticação acesso', [
  r(10, 28, 80, 32, 'N', 9),
  c(28, 44, 4.5, 'd'),
  c(40, 44, 4.5, 'd'),
  c(52, 44, 4.5, 'd'),
  c(64, 44, 4.5, 'd'),
  r(74, 36, 3.5, 16, 'b', 1.5),
]);
P('protecao', 'cofre', 'Cofre', 'valores guardar seguro bens', [
  r(16, 14, 68, 56, 'N', 6),
  r(22, 20, 56, 44, 'B', 4),
  c(50, 42, 12, 'b'),
  c(50, 42, 4, 'w'),
  l(50, 28, 50, 56, 'w', 2.5),
  l(36, 42, 64, 42, 'w', 2.5),
  r(24, 70, 8, 4, 'd'),
  r(68, 70, 8, 4, 'd'),
]);
P('protecao', 'guardachuva', 'Guarda-chuva', 'cobertura seguro prevenção proteger', [
  a('M10 44A40 34 0 0 1 90 44Z', 'b'),
  a('M50 10A40 34 0 0 1 90 44H50Z', 'B'),
  k('M50 44V66a6 6 0 0 0 12 0', 'd', 4),
  l(50, 6, 50, 11, 'd', 3),
]);
P('protecao', 'aviso', 'Aviso de perigo', 'alerta cuidado risco atenção', [
  g([50, 10, 88, 70, 12, 70], 'b'),
  l(50, 30, 50, 50, 'w', 6.5),
  c(50, 60, 3.8, 'w'),
]);

/* ---- Saúde ---- */
P('saude', 'cruz', 'Cruz médica', 'hospital saúde clínica atendimento', [
  r(37, 12, 26, 60, 'b', 4),
  r(20, 29, 60, 26, 'b', 4),
  r(40, 15, 6, 54, 's', 3),
]);
P('saude', 'pulso', 'Coração com pulso', 'cardiologia batimento ritmo cardíaco', [
  a(HEART, 'b'),
  k('M24 46H38L45 32L54 58L60 46H76', 'w', 3.5),
]);
P('saude', 'estetoscopio', 'Estetoscópio', 'consulta médico ausculta diagnóstico', [
  k('M30 12V34a20 20 0 0 0 40 0V12', 'd', 4),
  k('M50 54v8a14 14 0 0 0 28 0v-6', 'd', 4),
  c(78, 52, 7.5, 'b'),
  c(30, 12, 3.5, 'N'),
  c(70, 12, 3.5, 'N'),
]);
P('saude', 'pilula', 'Cápsula', 'remédio medicamento tratamento dose', [
  r(34, 12, 32, 60, 'n', 16),
  a('M34 42V28a16 16 0 0 1 32 0V42Z', 'b'),
  l(34, 42, 66, 42, 'N', 2),
]);
P('saude', 'seringa', 'Seringa', 'vacina injeção imunização', [
  r(10, 36, 4, 20, 'd', 1),
  l(14, 46, 22, 46, 'd', 4),
  r(22, 38, 46, 16, 'n', 3),
  r(26, 42, 24, 8, 'b'),
  r(62, 33, 4, 26, 'd', 1),
  l(68, 46, 88, 46, 'd', 2.5),
]);
P('saude', 'dente', 'Dente', 'odontologia dentista higiene bucal', [
  a(
    'M30 16C38 10 46 16 50 16C54 16 62 10 70 16C80 24 74 42 70 56C68 68 60 68 58 56C56 46 44 46 42 56C40 68 32 68 30 56C26 42 20 24 30 16Z',
    'n',
  ),
  k(
    'M30 16C38 10 46 16 50 16C54 16 62 10 70 16C80 24 74 42 70 56C68 68 60 68 58 56C56 46 44 46 42 56C40 68 32 68 30 56C26 42 20 24 30 16Z',
    'N',
    2.5,
  ),
  k('M36 24q4-4 8-2', 'w', 3),
]);
P('saude', 'gota', 'Gota de sangue', 'doação exame hemograma hidratação', [
  a(DROP, 'b'),
  k('M37 56a13 13 0 0 0 8 12', 'w', 4),
]);
P('saude', 'termometro', 'Termômetro', 'febre temperatura sintoma', [
  r(43, 8, 14, 50, 'n', 7),
  r(47.5, 24, 5, 34, 'b', 2.5),
  c(50, 62, 12, 'b'),
  l(60, 18, 67, 18, 'd', 2),
  l(60, 28, 67, 28, 'd', 2),
  l(60, 38, 67, 38, 'd', 2),
]);
P('saude', 'prontuario', 'Prontuário', 'ficha clínica registro paciente', [
  r(24, 12, 52, 60, 'N', 5),
  r(30, 22, 40, 46, 'w', 2),
  r(39, 8, 22, 9, 'd', 3),
  l(36, 34, 64, 34, 'N', 3),
  l(36, 44, 58, 44, 'N', 3),
  r(36, 52, 16, 3.5, 'b', 1.5),
  r(36, 57, 3.5, 3.5, 'b'),
  r(36, 49, 3.5, 3.5, 'b'),
]);
P('saude', 'balanca', 'Balança corporal', 'peso dieta bem-estar medida', [
  r(16, 22, 68, 48, 'N', 9),
  r(30, 28, 40, 22, 'n', 11),
  k('M35 46a15 15 0 0 1 30 0', 'b', 4),
  l(50, 46, 57, 36, 'd', 2.5),
  r(30, 58, 40, 4, 'B', 2),
]);

/* ---- Finanças ---- */
P('financas', 'moedas', 'Pilha de moedas', 'dinheiro economia poupança juros', [
  ...cyl(48, 54, 44, 12, 's', 'B', 7),
  ...cyl(54, 40, 44, 12, 'b', 'B', 7),
  ...cyl(48, 26, 44, 12, 's', 'B', 7),
  hx(48, 26, 5, 'b'),
]);
P('financas', 'cartao', 'Cartão de crédito', 'pagamento compra débito', [
  r(12, 22, 76, 48, 'b', 7),
  r(12, 32, 76, 11, 'd'),
  r(21, 52, 14, 10, 's', 2),
  l(46, 58, 74, 58, 'w', 3.5),
]);
P('financas', 'barras', 'Barras crescentes', 'crescimento lucro resultado desempenho', [
  r(18, 50, 14, 22, 'N', 2),
  r(36, 40, 14, 32, 's', 2),
  r(54, 28, 14, 44, 'b', 2),
  r(72, 14, 14, 58, 'B', 2),
]);
P('financas', 'linha', 'Gráfico de linha', 'tendência evolução série histórico alta', [
  k('M14 12V72H88', 'd', 3),
  k('M22 62L40 46L54 54L78 24', 'b', 5.5),
  g([88, 16, 72, 20, 84, 32], 'b'),
]);
P('financas', 'carteira', 'Carteira', 'dinheiro bolso gasto pagamento', [
  r(12, 24, 76, 46, 'N', 9),
  r(12, 24, 76, 16, 'B', 8),
  r(58, 46, 30, 17, 'b', 6),
  c(68, 54.5, 3.5, 'w'),
]);
P('financas', 'cedula', 'Cédula', 'nota dinheiro papel-moeda', [
  r(10, 24, 80, 44, 'b', 5),
  c(50, 46, 14, 'B'),
  c(50, 46, 7, 's'),
  c(22, 36, 3.5, 's'),
  c(78, 56, 3.5, 's'),
]);
P('financas', 'calculadora', 'Calculadora', 'conta cálculo orçamento contabilidade', [
  r(24, 8, 52, 64, 'N', 6),
  r(30, 14, 40, 14, 'b', 2),
  ...[0, 1, 2].flatMap((j) =>
    [0, 1, 2].map((i) => r(30 + i * 14, 34 + j * 11, 10, 7, i === 2 && j === 2 ? 'b' : 'w', 2)),
  ),
]);
P('financas', 'percentual', 'Percentual', 'taxa desconto juros porcentagem', [
  c(30, 26, 11, 'b'),
  c(70, 60, 11, 'b'),
  c(30, 26, 4.5, 'w'),
  c(70, 60, 4.5, 'w'),
  l(76, 14, 24, 72, 'd', 6.5),
]);
P('financas', 'lingote', 'Lingote de ouro', 'investimento reserva valor patrimônio', [
  g([8, 72, 16, 54, 44, 54, 50, 72], 'b'),
  g([50, 72, 56, 54, 84, 54, 92, 72], 'B'),
  g([28, 54, 36, 36, 64, 36, 72, 54], 's'),
  l(22, 64, 40, 64, 'w', 3),
  l(60, 64, 78, 64, 'w', 3),
  l(42, 46, 58, 46, 'b', 3),
]);
P('financas', 'pizza', 'Gráfico de pizza', 'participação proporção distribuição fatia', [
  c(50, 42, 28, 'n'),
  wedge(50, 42, 28, -90, 0, 'b'),
  wedge(50, 42, 28, 0, 90, 'B'),
  wedge(50, 42, 28, 90, 150, 's'),
]);

/* ---- Educação ---- */
P('educacao', 'livro', 'Livro aberto', 'leitura estudo conhecimento capítulo', [
  a('M50 24C40 15 26 15 12 21V64C26 58 40 58 50 66Z', 'n'),
  a('M50 24C60 15 74 15 88 21V64C74 58 60 58 50 66Z', 's'),
  l(50, 24, 50, 66, 'd', 2.5),
  l(20, 31, 42, 33, 'N', 2.5),
  l(20, 40, 42, 42, 'N', 2.5),
  l(58, 33, 80, 31, 'N', 2.5),
  l(58, 42, 80, 40, 'N', 2.5),
]);
P('educacao', 'capelo', 'Capelo de formatura', 'graduação formatura diploma conclusão', [
  g([50, 14, 90, 30, 50, 46, 10, 30], 'd'),
  a('M28 38V54C28 64 72 64 72 54V38L50 46Z', 'B'),
  l(84, 33, 84, 54, 'b', 2.5),
  c(84, 57, 4, 'b'),
]);
P('educacao', 'lapis', 'Lápis', 'escrever anotar escola desenho', [
  r(38, 6, 24, 10, 'N', 3),
  r(38, 16, 24, 4, 'B'),
  r(38, 20, 24, 36, 'b'),
  g([38, 56, 62, 56, 50, 74], 's'),
  g([46, 67, 54, 67, 50, 74], 'd'),
]);
P('educacao', 'lousa', 'Lousa', 'aula sala professor explicar quadro', [
  r(12, 14, 76, 50, 'N', 4),
  r(18, 20, 64, 38, 'd', 2),
  k('M26 34q6-8 10 0t10 0t10 0', 'w', 2.5),
  l(26, 46, 58, 46, 'w', 2.5),
  r(12, 64, 76, 6, 'N', 2),
]);
P('educacao', 'globo', 'Globo terrestre', 'geografia mundo países planeta', [
  c(50, 38, 26, 'b'),
  k('M50 12A12 26 0 0 0 50 64', 's', 2.5),
  k('M50 12A12 26 0 0 1 50 64', 's', 2.5),
  l(24, 38, 76, 38, 's', 2.5),
  k('M28 24Q50 30 72 24', 's', 2.5),
  k('M28 52Q50 46 72 52', 's', 2.5),
  r(36, 66, 28, 5, 'd', 2.5),
]);
P('educacao', 'esquadro', 'Esquadro', 'matemática geometria medida régua', [
  g([14, 70, 14, 12, 72, 70], 'b'),
  g([27, 58, 27, 36, 49, 58], 'w'),
  l(14, 24, 20, 24, 'w', 2),
  l(14, 36, 20, 36, 'w', 2),
  l(14, 48, 20, 48, 'w', 2),
]);
P('educacao', 'mochila', 'Mochila', 'escola aluno material estudante', [
  k('M40 22V17a10 10 0 0 1 20 0v5', 'd', 4),
  r(24, 20, 52, 52, 'b', 14),
  r(32, 46, 36, 20, 'B', 5),
  l(32, 46, 68, 46, 'w', 2),
  r(40, 52, 20, 4, 'w', 2),
]);
P('educacao', 'abaco', 'Ábaco', 'contar aritmética básica números infantil', [
  r(12, 14, 76, 56, 'N', 4),
  r(17, 19, 66, 46, 'n', 2),
  ...[28, 42, 56].flatMap((y, j) => [
    l(17, y, 83, y, 'd', 2),
    ...[0, 1, 2, 3, 4].map((i) => c(26 + i * 10 + (j === 1 ? 8 : 0), y, 4.5, i % 2 ? 'B' : 'b')),
  ]),
]);
P('educacao', 'diploma', 'Diploma', 'certificado título conquista formação', [
  r(20, 24, 60, 34, 'n', 3),
  r(12, 22, 10, 38, 'N', 5),
  r(78, 22, 10, 38, 'N', 5),
  r(46, 24, 8, 34, 'b'),
  c(50, 62, 8, 'b'),
  g([45, 68, 42, 78, 50, 73], 'B'),
  g([55, 68, 58, 78, 50, 73], 'B'),
]);
P('educacao', 'ideia', 'Lâmpada de ideia', 'criatividade insight solução inovação', [
  c(50, 34, 21, 'b'),
  g([39, 48, 61, 48, 56, 62, 44, 62], 'b'),
  r(42, 62, 16, 5, 'd', 2),
  r(44, 68, 12, 5, 'd', 2.5),
  k('M43 38l7 9 7-9', 'w', 3),
  l(50, 4, 50, 8, 'd', 3),
  l(22, 14, 25, 18, 'd', 3),
  l(78, 14, 75, 18, 'd', 3),
]);

/* ---- Natureza ---- */
P('natureza', 'arvore', 'Árvore', 'floresta meio ambiente sombra madeira', [
  r(44, 44, 12, 28, 'N'),
  c(50, 28, 22, 'b'),
  c(34, 42, 14, 'b'),
  c(66, 42, 14, 'b'),
  c(43, 21, 5, 's'),
]);
P('natureza', 'pinheiro', 'Pinheiro', 'floresta montanha inverno conífera', [
  r(45, 62, 10, 10, 'N'),
  g([50, 6, 70, 30, 30, 30], 'B'),
  g([50, 20, 76, 50, 24, 50], 'b'),
  g([50, 36, 82, 66, 18, 66], 'B'),
]);
P('natureza', 'folha', 'Folha', 'sustentável verde ecologia planta', [
  a('M18 68C18 32 44 14 82 14C82 50 62 72 18 68Z', 'b'),
  k('M22 64L66 28', 'w', 3),
]);
P('natureza', 'flor', 'Flor', 'jardim primavera pétala beleza', [
  l(50, 52, 50, 74, 'N', 4),
  a('M50 64Q66 50 76 58Q66 72 50 64Z', 'B'),
  c(50, 24, 11, 'b'),
  c(65, 35, 11, 'b'),
  c(59, 52, 11, 'b'),
  c(41, 52, 11, 'b'),
  c(35, 35, 11, 'b'),
  c(50, 40, 9, 's'),
]);
P('natureza', 'montanhas', 'Montanhas', 'paisagem altitude trilha cume desafio', [
  g([6, 72, 34, 28, 62, 72], 'N'),
  g([32, 72, 62, 16, 94, 72], 'b'),
  g([62, 16, 52, 32, 62, 27, 71, 33], 'w'),
  c(80, 22, 7, 's'),
]);
P('natureza', 'sol', 'Sol', 'dia luz calor clima verão', [
  c(50, 40, 17, 'b'),
  ...Array.from({ length: 8 }, (_, i) =>
    l(
      50 + 24 * Math.cos(rad(i * 45)),
      40 + 24 * Math.sin(rad(i * 45)),
      50 + 32 * Math.cos(rad(i * 45)),
      40 + 32 * Math.sin(rad(i * 45)),
      'b',
      4.5,
    ),
  ),
]);
P('natureza', 'chuva', 'Chuva', 'tempo clima nuvem água precipitação', [
  c(35, 34, 12, 'N'),
  c(52, 28, 16, 'N'),
  c(68, 36, 12, 'N'),
  r(35, 34, 33, 14, 'N'),
  l(38, 58, 33, 70, 'b', 4.5),
  l(52, 58, 47, 70, 'b', 4.5),
  l(66, 58, 61, 70, 'b', 4.5),
]);
P('natureza', 'cogumelo', 'Cogumelo', 'fungo floresta biodiversidade', [
  r(40, 40, 20, 30, 'n', 7),
  a('M14 48A36 32 0 0 1 86 48Z', 'b'),
  c(36, 36, 5.5, 'w'),
  c(58, 28, 6.5, 'w'),
  c(70, 40, 4.5, 'w'),
]);
P('natureza', 'borboleta', 'Borboleta', 'inseto transformação leveza fauna', [
  e(33, 33, 17, 21, 'b'),
  e(67, 33, 17, 21, 'b'),
  e(36, 56, 12, 13, 'B'),
  e(64, 56, 12, 13, 'B'),
  r(47, 22, 6, 46, 'd', 3),
  k('M48 22Q43 12 36 9', 'd', 2.2),
  k('M52 22Q57 12 64 9', 'd', 2.2),
]);
P('natureza', 'ondas', 'Ondas', 'mar oceano água rio maré', [
  k('M8 30Q21 18 34 30T60 30T92 30', 'b', 7),
  k('M8 46Q21 34 34 46T60 46T92 46', 'B', 7),
  k('M8 62Q21 50 34 62T60 62T92 62', 's', 7),
]);

/* ---- Alimentação ---- */
P('alimentacao', 'maca', 'Maçã', 'fruta saudável nutrição dieta', [
  c(38, 46, 20, 'b'),
  c(62, 46, 20, 'b'),
  r(38, 36, 24, 28, 'b'),
  l(50, 28, 53, 14, 'd', 4),
  a('M53 22Q66 12 76 20Q64 30 53 22Z', 'B'),
  e(34, 40, 4, 6, 's'),
]);
P('alimentacao', 'pizza', 'Fatia de pizza', 'italiana lanche refeição fast-food', [
  g([50, 72, 12, 20, 88, 20], 's'),
  k('M12 20Q50 8 88 20', 'N', 8),
  c(40, 36, 5.5, 'b'),
  c(60, 33, 5.5, 'b'),
  c(50, 52, 5.5, 'b'),
]);
P('alimentacao', 'hamburguer', 'Hambúrguer', 'lanche fast-food restaurante sanduíche', [
  a('M16 38A34 26 0 0 1 84 38Z', 'b'),
  e(38, 26, 3, 1.6, 's'),
  e(54, 22, 3, 1.6, 's'),
  e(66, 29, 3, 1.6, 's'),
  r(14, 38, 72, 8, 's', 4),
  r(16, 46, 68, 11, 'N', 5.5),
  r(16, 57, 68, 11, 'b', 5.5),
]);
P('alimentacao', 'cafe', 'Xícara de café', 'bebida manhã pausa cafeteria', [
  k('M38 24q-4-6 0-12', 'N', 3),
  k('M52 24q-4-6 0-12', 'N', 3),
  a('M20 32H66V50A23 23 0 0 1 20 50Z', 'b'),
  k('M66 38h6a9 9 0 0 1 0 18h-8', 'b', 5),
  e(43, 72, 32, 5, 'N'),
]);
P('alimentacao', 'sorvete', 'Sorvete', 'sobremesa doce verão gelado', [
  g([34, 44, 66, 44, 50, 76], 'N'),
  c(38, 36, 13, 's'),
  c(62, 36, 13, 'b'),
  c(50, 24, 13, 'B'),
  c(50, 9, 4.5, 'd'),
]);
P('alimentacao', 'talheres', 'Garfo e faca', 'refeição restaurante jantar mesa', [
  k('M26 10V28a6 6 0 0 0 12 0V10', 'd', 3.5),
  l(32, 34, 32, 72, 'd', 5.5),
  a('M62 10C74 14 74 40 62 46Z', 'b'),
  r(59, 46, 6, 26, 'd', 3),
]);
P('alimentacao', 'ovo', 'Ovo frito', 'café-da-manhã proteína receita', [
  c(36, 46, 16, 'n'),
  c(60, 42, 20, 'n'),
  c(50, 58, 17, 'n'),
  c(28, 58, 10, 'n'),
  c(52, 46, 11, 'b'),
  c(48, 42, 3.5, 's'),
]);
P('alimentacao', 'cupcake', 'Cupcake', 'confeitaria doce festa bolo', [
  a('M26 44H74L68 70H32Z', 'B'),
  l(40, 48, 42, 66, 'N', 1.8),
  l(50, 48, 50, 66, 'N', 1.8),
  l(60, 48, 58, 66, 'N', 1.8),
  c(37, 42, 12, 's'),
  c(63, 42, 12, 's'),
  c(50, 32, 14, 's'),
  c(50, 18, 5.5, 'b'),
]);
P('alimentacao', 'melancia', 'Melancia', 'fruta verão refrescante fatia', [
  a('M10 28A40 40 0 0 0 90 28Z', 'b'),
  k('M10 28A40 40 0 0 0 90 28', 'N', 5),
  e(34, 44, 2.2, 3.5, 'd'),
  e(50, 52, 2.2, 3.5, 'd'),
  e(66, 44, 2.2, 3.5, 'd'),
  e(42, 34, 2.2, 3.5, 'd'),
  e(58, 34, 2.2, 3.5, 'd'),
]);
P('alimentacao', 'suco', 'Copo de suco', 'bebida natural laranja hidratação', [
  l(56, 34, 66, 8, 'd', 4),
  g([26, 22, 74, 22, 67, 70, 33, 70], 'n'),
  g([28, 34, 72, 34, 67, 70, 33, 70], 'b'),
  c(74, 24, 8.5, 's'),
  l(74, 17, 74, 31, 'b', 1.8),
  l(67, 24, 81, 24, 'b', 1.8),
]);

/* ---- Justiça e crime ---- */
P('justica', 'balanca', 'Balança da justiça', 'lei justiça equilíbrio julgamento direito', [
  r(48, 14, 4, 52, 'd'),
  l(20, 22, 80, 22, 'd', 4),
  c(50, 14, 4.5, 'b'),
  l(26, 22, 18, 44, 'd', 2),
  l(26, 22, 34, 44, 'd', 2),
  a('M14 44H38a12 8 0 0 1-24 0Z', 'b'),
  l(74, 22, 66, 44, 'd', 2),
  l(74, 22, 82, 44, 'd', 2),
  a('M62 44H86a12 8 0 0 1-24 0Z', 'b'),
  r(34, 66, 32, 6, 'N', 2),
]);
P('justica', 'martelo', 'Martelo de juiz', 'sentença tribunal decisão veredito', [
  T(-30, 50, 44, [r(48, 26, 6, 44, 'd', 3), r(30, 14, 42, 20, 'b', 4)]),
  r(28, 66, 44, 6, 'N', 3),
]);
P('justica', 'algemas', 'Algemas', 'prisão detenção preso polícia', [
  o(30, 44, 16, 'd', 7),
  o(70, 44, 16, 'd', 7),
  l(46, 44, 54, 44, 'b', 5),
  c(30, 62, 3.5, 'b'),
  c(70, 62, 3.5, 'b'),
]);
P('justica', 'distintivo', 'Distintivo', 'polícia autoridade investigação agente', [
  a('M50 8L82 18V42C82 60 69 68 50 76C31 68 18 60 18 42V18Z', 'N'),
  st(50, 40, 18, 8, 'b'),
]);
P('justica', 'lupa', 'Lupa investigativa', 'investigação evidência análise perícia', [
  o(42, 36, 22, 'd', 6.5),
  c(42, 36, 18, 's'),
  l(58, 52, 80, 72, 'd', 9),
  k('M30 30a14 14 0 0 1 9-7', 'w', 3.5),
]);
P('justica', 'sirene', 'Sirene', 'viatura emergência ocorrência polícia', [
  l(50, 6, 50, 14, 'd', 3),
  l(24, 18, 30, 24, 'd', 3),
  l(76, 18, 70, 24, 'd', 3),
  a('M30 56V42a20 20 0 0 1 40 0V56Z', 'b'),
  r(38, 36, 5, 14, 'w', 2.5),
  r(24, 56, 52, 12, 'N', 3),
]);
P('justica', 'codigo', 'Código de leis', 'legislação lei artigo norma livro', [
  r(20, 12, 60, 60, 'B', 4),
  r(20, 12, 12, 60, 'd', 3),
  r(38, 26, 34, 20, 's', 2),
  l(42, 54, 68, 54, 'w', 3),
  l(42, 62, 60, 62, 'w', 3),
]);
P('justica', 'grade', 'Grade de cela', 'prisão pena cadeia reclusão', [
  r(16, 12, 68, 7, 'd', 2),
  r(16, 62, 68, 7, 'd', 2),
  ...[26, 38, 50, 62, 74].map((x) => l(x, 19, x, 62, 'N', 5.5)),
]);
P('justica', 'tribunal', 'Tribunal', 'fórum corte justiça poder judiciário', [
  g([50, 10, 88, 30, 12, 30], 'b'),
  r(20, 34, 9, 28, 'N'),
  r(36, 34, 9, 28, 'N'),
  r(55, 34, 9, 28, 'N'),
  r(71, 34, 9, 28, 'N'),
  r(12, 62, 76, 8, 'B', 2),
  r(8, 70, 84, 5, 'N'),
]);
P('justica', 'pasta', 'Pasta de processo', 'caso arquivo documentos inquérito', [
  r(14, 14, 32, 14, 'B', 3),
  r(14, 22, 72, 48, 'b', 5),
  r(22, 30, 56, 12, 'n', 2),
  l(30, 54, 62, 54, 'w', 3),
  l(30, 62, 52, 62, 'w', 3),
]);

/* ---- Esporte ---- */
P('esporte', 'futebol', 'Bola de futebol', 'jogo campo gol copa time', [
  c(50, 42, 29, 'n'),
  poly(50, 42, 10, 5, 'd'),
  ...[0, 1, 2, 3, 4].map((i) =>
    l(
      50 + 10 * Math.cos(rad(-90 + i * 72)),
      42 + 10 * Math.sin(rad(-90 + i * 72)),
      50 + 22 * Math.cos(rad(-90 + i * 72)),
      42 + 22 * Math.sin(rad(-90 + i * 72)),
      'd',
      2.5,
    ),
  ),
  o(50, 42, 29, 'd', 3),
]);
P('esporte', 'medalha', 'Medalha', 'premiação pódio conquista colocação', [
  g([32, 8, 48, 8, 60, 38, 44, 38], 'b'),
  g([68, 8, 52, 8, 40, 38, 56, 38], 'B'),
  c(50, 54, 19, 'N'),
  c(50, 54, 14, 'b'),
  st(50, 54, 10, 4.5, 'w'),
]);
P('esporte', 'haltere', 'Haltere', 'academia musculação treino força', [
  l(22, 40, 78, 40, 'd', 5),
  r(14, 28, 8, 24, 'b', 3),
  r(24, 21, 9, 38, 'b', 3),
  r(67, 21, 9, 38, 'b', 3),
  r(78, 28, 8, 24, 'b', 3),
]);
P('esporte', 'raquete', 'Raquete', 'tênis jogo quadra saque', [
  o(50, 30, 21, 'b', 6.5),
  l(34, 30, 66, 30, 's', 1.6),
  l(50, 12, 50, 48, 's', 1.6),
  l(38, 18, 62, 42, 's', 1.6),
  l(62, 18, 38, 42, 's', 1.6),
  l(50, 51, 50, 60, 'd', 5.5),
  r(45, 60, 10, 14, 'N', 4),
]);
P('esporte', 'tenis', 'Tênis de corrida', 'corrida caminhada calçado maratona', [
  r(12, 56, 76, 10, 'N', 4),
  a('M14 56V34L34 32L44 44H68C80 44 88 50 88 56Z', 'b'),
  l(44, 52, 78, 52, 'w', 3.5),
  l(26, 38, 34, 44, 'w', 2.5),
  l(32, 34, 40, 41, 'w', 2.5),
]);
P('esporte', 'apito', 'Apito', 'árbitro regra falta partida', [
  r(50, 36, 38, 14, 'B', 3),
  c(40, 48, 19, 'b'),
  c(40, 48, 7, 'd'),
  o(32, 26, 7, 'd', 3.5),
]);
P('esporte', 'cronometro', 'Cronômetro', 'tempo recorde prova velocidade', [
  r(43, 10, 14, 7, 'd', 2),
  l(50, 17, 50, 22, 'd', 4),
  c(50, 46, 26, 'N'),
  c(50, 46, 21, 'n'),
  l(50, 46, 50, 30, 'd', 3.5),
  l(50, 46, 63, 53, 'b', 3.5),
  c(50, 46, 3, 'd'),
]);
P('esporte', 'campo', 'Campo', 'quadra estádio partida tática', [
  g([24, 18, 76, 18, 90, 68, 10, 68], 'b'),
  l(50, 18, 50, 68, 'w', 2.5),
  o(50, 43, 10, 'w', 2.5),
  k('M20 38H30V54H17', 'w', 2.2),
  k('M80 38H70V54H83', 'w', 2.2),
]);
P('esporte', 'basquete', 'Bola de basquete', 'quadra cesta jogo equipe', [
  c(50, 42, 29, 'b'),
  l(21, 42, 79, 42, 'd', 2.5),
  l(50, 13, 50, 71, 'd', 2.5),
  k('M30 20Q44 42 30 64', 'd', 2.5),
  k('M70 20Q56 42 70 64', 'd', 2.5),
  o(50, 42, 29, 'd', 2.5),
]);
P('esporte', 'bandeira', 'Bandeira de chegada', 'largada final corrida vitória linha', [
  l(26, 8, 26, 74, 'd', 4.5),
  ...[0, 1, 2, 3].flatMap((i) =>
    [0, 1, 2].map((j) => r(30 + i * 13, 10 + j * 13, 13, 13, (i + j) % 2 ? 'd' : 'n')),
  ),
]);

/* ---- Viagem ---- */
P('viagem', 'aviao', 'Avião', 'voo aeroporto passagem destino', [
  r(44, 8, 12, 58, 'N', 6),
  g([44, 32, 10, 48, 10, 56, 44, 48], 'b'),
  g([56, 32, 90, 48, 90, 56, 56, 48], 'b'),
  g([44, 56, 32, 68, 32, 72, 50, 66, 68, 72, 68, 68, 56, 56], 'B'),
  c(50, 17, 3.5, 'd'),
]);
P('viagem', 'mala', 'Mala de viagem', 'bagagem turismo hospedagem partida', [
  k('M40 26V20a4 4 0 0 1 4-4H56a4 4 0 0 1 4 4V26', 'd', 4.5),
  r(18, 26, 64, 42, 'b', 6),
  r(32, 26, 6, 42, 'B'),
  r(62, 26, 6, 42, 'B'),
  c(30, 72, 4, 'd'),
  c(70, 72, 4, 'd'),
]);
P('viagem', 'pin', 'Marcador de mapa', 'localização destino endereço lugar', [
  a('M50 8C34 8 24 21 24 35C24 54 50 78 50 78C50 78 76 54 76 35C76 21 66 8 50 8Z', 'b'),
  c(50, 35, 10.5, 'w'),
]);
P('viagem', 'bussola', 'Bússola', 'orientação direção rota explorar', [
  c(50, 42, 30, 'N'),
  c(50, 42, 24, 'n'),
  g([50, 22, 58, 42, 42, 42], 'b'),
  g([50, 62, 58, 42, 42, 42], 'd'),
  c(50, 42, 3.2, 'w'),
  l(50, 14, 50, 18, 'd', 2.5),
  l(50, 66, 50, 70, 'd', 2.5),
  l(22, 42, 26, 42, 'd', 2.5),
  l(74, 42, 78, 42, 'd', 2.5),
]);
P('viagem', 'barraca', 'Barraca', 'camping aventura acampamento natureza', [
  g([50, 12, 90, 70, 10, 70], 'b'),
  g([50, 34, 66, 70, 34, 70], 'B'),
  l(50, 12, 50, 6, 'd', 2.5),
]);
P('viagem', 'passaporte', 'Passaporte', 'documento viagem internacional fronteira', [
  r(24, 8, 52, 64, 'b', 5),
  c(50, 32, 12, 's'),
  k('M38 32H62M50 20V44', 'b', 2),
  l(36, 54, 64, 54, 'w', 3.5),
  l(40, 62, 60, 62, 'w', 3.5),
]);
P('viagem', 'camera', 'Câmera fotográfica', 'foto registro memória turismo', [
  r(12, 26, 76, 42, 'N', 7),
  r(28, 18, 22, 10, 'B', 3),
  c(50, 47, 16, 'd'),
  c(50, 47, 10.5, 'b'),
  c(46, 43, 3.2, 'w'),
  r(72, 31, 10, 6, 'w', 2),
]);
P('viagem', 'balao', 'Balão de ar quente', 'passeio aventura céu experiência', [
  c(50, 30, 24, 'b'),
  g([27, 40, 73, 40, 59, 58, 41, 58], 'b'),
  e(50, 30, 10, 23, 's'),
  l(44, 58, 44, 64, 'd', 1.8),
  l(56, 58, 56, 64, 'd', 1.8),
  r(38, 64, 24, 10, 'N', 2),
]);
P('viagem', 'embarque', 'Cartão de embarque', 'passagem bilhete voo reserva', [
  r(12, 20, 76, 46, 'n', 5),
  r(12, 20, 76, 12, 'b', 5),
  l(64, 32, 64, 66, 'N', 2),
  l(20, 42, 54, 42, 'N', 3.5),
  l(20, 52, 46, 52, 'N', 3.5),
  l(70, 42, 70, 58, 'd', 2),
  l(75, 42, 75, 58, 'd', 3),
  l(81, 42, 81, 58, 'd', 2),
]);
P('viagem', 'mapa', 'Mapa dobrado', 'roteiro rota navegação trajeto', [
  g([10, 26, 32, 18, 32, 66, 10, 74], 'n'),
  g([32, 18, 54, 26, 54, 74, 32, 66], 's'),
  g([54, 26, 76, 18, 76, 66, 54, 74], 'n'),
  k('M18 62Q34 32 48 48T68 30', 'b', 3),
  c(72, 28, 4.5, 'b'),
]);

/* ---- Negócios ---- */
P('negocios', 'maleta', 'Maleta executiva', 'trabalho carreira empresa reunião', [
  k('M40 26V20H60V26', 'd', 4.5),
  r(14, 26, 72, 44, 'N', 6),
  l(14, 46, 86, 46, 'B', 3),
  r(44, 42, 12, 9, 'b', 2),
]);
P('negocios', 'alvo', 'Alvo', 'meta objetivo foco estratégia', [
  c(50, 42, 30, 'n'),
  c(50, 42, 22, 'b'),
  c(50, 42, 13, 'n'),
  c(50, 42, 5.5, 'b'),
  l(50, 42, 84, 8, 'd', 3),
  g([88, 4, 88, 18, 74, 4], 'd'),
]);
P('negocios', 'podio', 'Pódio', 'ranking competição resultado líder', [
  r(14, 46, 22, 26, 'N'),
  r(39, 34, 22, 38, 'b'),
  r(64, 54, 22, 18, 'N'),
  st(50, 20, 11, 4.5, 'b'),
]);
P('negocios', 'organograma', 'Organograma', 'equipe hierarquia estrutura empresa', [
  k('M50 26V36M22 36H78M22 36V46M50 36V46M78 36V46', 'd', 3),
  r(37, 12, 26, 14, 'b', 3),
  r(12, 46, 22, 14, 'N', 3),
  r(39, 46, 22, 14, 'N', 3),
  r(66, 46, 22, 14, 'N', 3),
]);
P('negocios', 'equipe', 'Equipe', 'time pessoas colaboração grupo', [
  c(28, 28, 9, 'N'),
  a('M10 66C10 48 18 42 28 42C38 42 46 48 46 66Z', 'N'),
  c(72, 28, 9, 'N'),
  a('M54 66C54 48 62 42 72 42C82 42 90 48 90 66Z', 'N'),
  c(50, 24, 11, 'b'),
  a('M28 72C28 50 38 44 50 44C62 44 72 50 72 72Z', 'b'),
]);
P('negocios', 'contrato', 'Contrato', 'acordo assinatura documento parceria', [
  r(20, 8, 50, 64, 'n', 4),
  l(28, 22, 62, 22, 'N', 3.5),
  l(28, 32, 62, 32, 'N', 3.5),
  l(28, 42, 52, 42, 'N', 3.5),
  k('M28 58q6-8 10 0t10-2', 'b', 2.5),
  l(58, 66, 84, 38, 'b', 6),
]);
P('negocios', 'funil', 'Funil de vendas', 'leads conversão clientes vendas marketing', [
  g([12, 14, 88, 14, 58, 46, 42, 46], 'b'),
  r(42, 46, 16, 20, 'B', 2),
  c(30, 22, 3, 's'),
  c(50, 24, 3, 's'),
  c(68, 22, 3, 's'),
  c(42, 32, 3, 's'),
  c(58, 34, 3, 's'),
]);
P('negocios', 'ima', 'Ímã', 'atração captação leads audiência', [
  k('M30 18V48a20 20 0 0 0 40 0V18', 'b', 14),
  r(23, 10, 14, 13, 's', 1),
  r(63, 10, 14, 13, 's', 1),
  l(14, 6, 20, 14, 'd', 2.5),
  l(86, 6, 80, 14, 'd', 2.5),
]);
P('negocios', 'megafone', 'Megafone', 'marketing anúncio divulgação campanha', [
  g([24, 34, 24, 56, 66, 70, 66, 20], 'b'),
  r(14, 36, 12, 18, 'd', 3),
  r(32, 56, 12, 16, 'd', 3),
  k('M74 34q7 11 0 22', 'd', 3),
  k('M82 26q14 19 0 38', 'd', 3),
]);
P('negocios', 'agenda', 'Agenda', 'calendário prazo planejamento compromisso', [
  r(16, 14, 68, 58, 'n', 5),
  r(16, 14, 68, 15, 'b', 5),
  l(34, 8, 34, 20, 'd', 4.5),
  l(66, 8, 66, 20, 'd', 4.5),
  ...[0, 1, 2].flatMap((j) =>
    [0, 1, 2, 3].map((i) => r(24 + i * 15, 36 + j * 11, 9, 6, i === 2 && j === 1 ? 'b' : 'N', 1.5)),
  ),
]);

/* ---- Música ---- */
P('musica', 'notas', 'Notas musicais', 'melodia canção som partitura', [
  c(32, 62, 10, 'b'),
  c(66, 56, 10, 'b'),
  l(41, 60, 41, 20, 'd', 5),
  l(75, 54, 75, 14, 'd', 5),
  g([41, 20, 75, 12, 75, 24, 41, 32], 'd'),
]);
P('musica', 'violao', 'Violão', 'instrumento cordas show banda', [
  r(46, 8, 8, 36, 'N', 2),
  r(43, 3, 14, 11, 'd', 2),
  e(50, 40, 15, 13, 'b'),
  e(50, 60, 21, 17, 'b'),
  c(50, 54, 6.5, 'd'),
  l(50, 28, 50, 68, 'w', 1.2),
]);
P('musica', 'piano', 'Teclado de piano', 'instrumento teclas concerto música clássica', [
  r(10, 24, 80, 46, 'n', 3),
  ...[22, 34, 46, 58, 70, 82].map((x) => l(x, 24, x, 70, 'N', 1.6)),
  ...[17, 29, 53, 65, 77].map((x) => r(x, 24, 8, 28, 'd', 1.5)),
]);
P('musica', 'fone', 'Fone de ouvido', 'ouvir podcast playlist áudio', [
  k('M20 56V46a30 30 0 0 1 60 0v10', 'd', 6.5),
  r(12, 46, 15, 26, 'b', 6),
  r(73, 46, 15, 26, 'b', 6),
]);
P('musica', 'microfone', 'Microfone', 'voz palestra podcast cantar gravação', [
  r(38, 8, 24, 38, 'b', 12),
  l(38, 20, 62, 20, 'w', 2),
  l(38, 28, 62, 28, 'w', 2),
  k('M28 36a22 22 0 0 0 44 0', 'd', 4),
  l(50, 58, 50, 68, 'd', 4),
  r(36, 67, 28, 5, 'd', 2),
]);
P('musica', 'vinil', 'Disco de vinil', 'álbum retrô lançamento discografia', [
  c(50, 42, 30, 'd'),
  o(50, 42, 24, 'N', 1.6),
  o(50, 42, 19, 'N', 1.6),
  c(50, 42, 11, 'b'),
  c(50, 42, 2.6, 'w'),
  k('M28 26A26 26 0 0 1 42 16', 'w', 2.5),
]);
P('musica', 'caixa', 'Caixa de som', 'alto-falante volume áudio festa', [
  r(22, 8, 56, 64, 'N', 6),
  c(50, 50, 16, 'd'),
  c(50, 50, 9, 'b'),
  c(50, 24, 7, 'd'),
  c(50, 24, 3.5, 'b'),
]);
P('musica', 'onda', 'Onda sonora', 'áudio frequência som ritmo', [
  ...[10, 26, 44, 30, 54, 22, 12].map((h, i) =>
    r(16 + i * 11, 42 - h / 2, 6.5, h, i % 2 ? 'B' : 'b', 3.2),
  ),
]);
P('musica', 'tambor', 'Tambor', 'bateria percussão ritmo banda', [
  e(50, 62, 29, 9, 'B'),
  r(21, 34, 58, 28, 'b'),
  e(50, 34, 29, 9, 's'),
  k('M26 40l12 22 12-22 12 22 12-22', 'B', 2),
  l(32, 8, 52, 32, 'd', 4.5),
  l(68, 8, 48, 32, 'd', 4.5),
]);
P('musica', 'pauta', 'Pauta musical', 'partitura composição notação estudo', [
  ...[28, 37, 46, 55, 64].map((y) => l(10, y, 90, y, 'N', 2)),
  c(28, 55, 5.5, 'b'),
  l(33, 55, 33, 28, 'd', 3),
  c(52, 46, 5.5, 'b'),
  l(57, 46, 57, 18, 'd', 3),
  c(76, 37, 5.5, 'b'),
  l(81, 37, 81, 10, 'd', 3),
]);

/* ---- Ciência ---- */
P('ciencia', 'atomo', 'Átomo', 'física química partícula elétron', [
  T(0, 50, 42, [q(50, 42, 34, 12, 'd', 2.6)]),
  T(60, 50, 42, [q(50, 42, 34, 12, 'd', 2.6)]),
  T(120, 50, 42, [q(50, 42, 34, 12, 'd', 2.6)]),
  c(50, 42, 8, 'b'),
  c(84, 42, 4.5, 'B'),
  c(33, 71.5, 4.5, 'B'),
  c(33, 12.5, 4.5, 'B'),
]);
P('ciencia', 'erlenmeyer', 'Frasco de laboratório', 'química experimento reação laboratório', [
  r(40, 8, 20, 5, 'N', 2),
  g([42, 12, 58, 12, 58, 34, 80, 68, 20, 68, 42, 34], 'n'),
  g([29, 54, 71, 54, 80, 68, 20, 68], 'b'),
  c(46, 60, 3, 's'),
  c(58, 62, 2.4, 's'),
  c(52, 56, 2, 's'),
]);
P('ciencia', 'microscopio', 'Microscópio', 'biologia célula análise pesquisa', [
  r(22, 66, 54, 7, 'N', 3),
  k('M62 64C84 60 82 28 58 24', 'd', 6),
  T(-20, 46, 30, [r(39, 8, 14, 34, 'b', 3), r(41, 4, 10, 6, 'd', 2), r(43, 42, 6, 9, 'd', 1)]),
  r(30, 54, 28, 5, 'N', 2),
]);
P('ciencia', 'tubos', 'Tubos de ensaio', 'amostra análise teste laboratório', [
  r(24, 10, 24, 62, 'n', 12),
  r(24, 40, 24, 32, 'b', 12),
  r(20, 8, 32, 5, 'N', 2.5),
  c(32, 54, 3, 's'),
  c(40, 60, 2.2, 's'),
  r(56, 24, 18, 48, 'n', 9),
  r(56, 44, 18, 28, 'B', 9),
  r(53, 22, 24, 5, 'N', 2.5),
]);
P('ciencia', 'telescopio', 'Telescópio', 'astronomia observar estrelas céu', [
  l(50, 52, 36, 74, 'd', 3),
  l(50, 52, 64, 74, 'd', 3),
  T(-28, 50, 40, [r(18, 32, 54, 17, 'b', 3), r(66, 29, 14, 23, 'd', 3), r(11, 36, 8, 9, 'd', 2)]),
]);
P('ciencia', 'dna', 'DNA', 'genética hélice biologia hereditariedade', [
  k('M32 10C32 28 68 28 68 42C68 56 32 56 32 70', 'b', 4.5),
  k('M68 10C68 28 32 28 32 42C32 56 68 56 68 70', 'd', 4.5),
  l(42, 20, 58, 20, 's', 3.5),
  l(41, 45, 59, 45, 's', 3.5),
  l(42, 64, 58, 64, 's', 3.5),
]);
P('ciencia', 'cristal', 'Cristal', 'mineral geologia diamante raro', [
  g([50, 8, 84, 30, 50, 74, 16, 30], 'b'),
  g([34, 16, 66, 16, 84, 30, 16, 30], 's'),
  l(16, 30, 50, 74, 'B', 2),
  l(84, 30, 50, 74, 'B', 2),
  l(34, 16, 42, 30, 'B', 2),
  l(66, 16, 58, 30, 'B', 2),
]);
P('ciencia', 'becker', 'Béquer', 'medição líquido química análise', [
  r(28, 10, 44, 62, 'n', 5),
  r(28, 40, 44, 32, 'b', 5),
  l(28, 22, 38, 22, 'd', 2),
  l(28, 30, 36, 30, 'd', 2),
  l(28, 38, 38, 38, 'd', 2),
  c(46, 56, 3, 's'),
  c(58, 62, 2.4, 's'),
  c(56, 50, 2, 's'),
]);
P('ciencia', 'senoide', 'Onda senoidal', 'física sinal frequência gráfico função', [
  k('M12 12V72', 'd', 2.5),
  k('M12 42H90', 'd', 2.5),
  k('M14 42Q27 4 40 42T66 42T92 42', 'b', 5),
]);
P('ciencia', 'cerebro', 'Cérebro', 'neurociência mente cognição aprendizado', [
  c(37, 36, 17, 'b'),
  c(63, 36, 17, 'b'),
  c(35, 54, 13, 'b'),
  c(65, 54, 13, 'b'),
  r(36, 36, 28, 22, 'b'),
  k('M50 20V66', 'B', 2.8),
  k('M30 36q8-8 14 0', 'B', 2.5),
  k('M56 36q8-8 14 0', 'B', 2.5),
  k('M30 56q7 6 14 0', 'B', 2.5),
  k('M56 56q7 6 14 0', 'B', 2.5),
]);

/* ---- Casa ---- */
P('casa', 'casa', 'Casa', 'moradia imóvel lar residência', [
  r(64, 16, 10, 16, 'N'),
  r(20, 38, 60, 34, 'n'),
  g([50, 10, 90, 40, 10, 40], 'b'),
  r(43, 50, 14, 22, 'B', 2),
  r(27, 46, 11, 11, 's', 1),
  r(62, 46, 11, 11, 's', 1),
]);
P('casa', 'sofa', 'Sofá', 'sala conforto móvel decoração', [
  r(18, 24, 64, 26, 'b', 9),
  r(12, 44, 76, 20, 'B', 6),
  r(8, 36, 14, 30, 'b', 6),
  r(78, 36, 14, 30, 'b', 6),
  r(20, 66, 5, 7, 'd'),
  r(75, 66, 5, 7, 'd'),
]);
P('casa', 'abajur', 'Abajur', 'luminária iluminação quarto decoração', [
  g([32, 12, 68, 12, 80, 40, 20, 40], 'b'),
  r(47, 40, 6, 28, 'd'),
  e(50, 70, 17, 4.5, 'N'),
]);
P('casa', 'geladeira', 'Geladeira', 'cozinha eletrodoméstico alimentos conservar', [
  r(28, 8, 44, 66, 'N', 5),
  l(28, 30, 72, 30, 'd', 2.5),
  r(62, 14, 4, 11, 'd', 2),
  r(62, 36, 4, 18, 'd', 2),
  c(40, 19, 2.5, 'b'),
]);
P('casa', 'planta', 'Planta em vaso', 'jardim decoração verde cultivo', [
  T(-35, 50, 40, [e(43, 38, 7.5, 18, 'b')]),
  T(35, 50, 40, [e(57, 38, 7.5, 18, 'b')]),
  e(50, 30, 8, 20, 'b'),
  g([32, 50, 68, 50, 63, 72, 37, 72], 'B'),
  r(30, 46, 40, 8, 'N', 2),
]);
P('casa', 'porta', 'Porta', 'entrada acesso casa chegada', [
  r(28, 8, 44, 64, 'b', 3),
  r(34, 16, 32, 20, 'B', 2),
  r(34, 42, 32, 22, 'B', 2),
  c(61, 45, 3.2, 's'),
]);
P('casa', 'tv', 'Televisão', 'sala entretenimento tela vídeo', [
  r(10, 16, 80, 46, 'd', 4),
  r(15, 21, 70, 36, 's', 2),
  r(36, 62, 28, 4, 'N'),
  r(28, 66, 44, 4, 'N', 2),
]);
P('casa', 'lavadora', 'Máquina de lavar', 'lavanderia roupa limpeza eletrodoméstico', [
  r(22, 8, 56, 64, 'n', 5),
  c(50, 46, 19, 'N'),
  c(50, 46, 14, 'b'),
  e(45, 41, 4, 3, 's'),
  r(28, 14, 44, 8, 'N', 2),
  c(34, 18, 2, 'b'),
]);
P('casa', 'martelo', 'Martelo', 'reforma obra conserto ferramenta', [
  T(35, 50, 40, [r(46, 22, 8, 50, 'N', 3), r(32, 12, 36, 16, 'b', 3)]),
]);
P('casa', 'cama', 'Cama', 'quarto descanso sono hospedagem', [
  r(12, 28, 7, 40, 'd', 2),
  r(14, 52, 74, 12, 'b', 3),
  r(20, 42, 22, 12, 'n', 5),
  r(18, 56, 70, 8, 'B', 3),
  r(18, 64, 5, 8, 'd'),
  r(79, 64, 5, 8, 'd'),
]);

/* ---- Transporte ---- */
P('transporte', 'carro', 'Carro', 'automóvel dirigir mobilidade trânsito', [
  r(10, 44, 80, 18, 'b', 6),
  a('M24 46L34 26H64L76 46Z', 'B'),
  g([32, 44, 38, 30, 48, 30, 48, 44], 's'),
  g([52, 44, 52, 30, 63, 30, 70, 44], 's'),
  c(28, 64, 9, 'd'),
  c(72, 64, 9, 'd'),
  c(28, 64, 3.5, 'n'),
  c(72, 64, 3.5, 'n'),
]);
P('transporte', 'onibus', 'Ônibus', 'transporte público passageiros linha', [
  r(12, 16, 76, 48, 'b', 7),
  r(18, 23, 14, 13, 's', 2),
  r(36, 23, 14, 13, 's', 2),
  r(54, 23, 14, 13, 's', 2),
  r(72, 23, 12, 26, 's', 2),
  r(12, 46, 76, 4, 'B'),
  c(30, 66, 7.5, 'd'),
  c(70, 66, 7.5, 'd'),
]);
P('transporte', 'bicicleta', 'Bicicleta', 'pedalar ciclismo sustentável mobilidade', [
  o(25, 56, 15, 'd', 4),
  o(75, 56, 15, 'd', 4),
  k('M25 56L43 32H62L75 56', 'b', 4.5),
  k('M43 32L53 56H25', 'b', 4.5),
  k('M62 32L60 22H70', 'd', 3.5),
  l(38, 28, 50, 28, 'd', 4),
]);
P('transporte', 'trem', 'Trem', 'metrô ferrovia estação viagem', [
  r(22, 10, 56, 54, 'b', 13),
  r(30, 18, 40, 20, 's', 5),
  c(36, 52, 4.5, 'n'),
  c(64, 52, 4.5, 'n'),
  l(22, 44, 78, 44, 'B', 3),
  l(28, 72, 22, 78, 'd', 3),
  l(72, 72, 78, 78, 'd', 3),
]);
P('transporte', 'navio', 'Navio', 'carga porto marítimo travessia', [
  r(46, 14, 8, 8, 'd', 1),
  r(40, 22, 20, 12, 'N', 2),
  r(30, 34, 40, 14, 'n', 2),
  g([12, 48, 88, 48, 78, 66, 22, 66], 'b'),
  k('M6 72q11-6 22 0t22 0t22 0t22 0', 'N', 3),
]);
P('transporte', 'moto', 'Moto', 'motocicleta entrega mobilidade rápida', [
  o(26, 56, 12, 'd', 4.5),
  o(74, 56, 12, 'd', 4.5),
  k('M26 56L42 38H62L74 56', 'b', 5),
  r(38, 30, 24, 7, 'd', 3),
  l(66, 34, 72, 24, 'd', 3.5),
  l(66, 24, 78, 24, 'd', 3.5),
]);
P('transporte', 'semaforo', 'Semáforo', 'trânsito sinal cruzamento regra', [
  r(46, 62, 8, 12, 'd'),
  r(34, 6, 32, 58, 'N', 6),
  c(50, 20, 7.5, 'd'),
  c(50, 35, 7.5, 'd'),
  c(50, 50, 7.5, 'b'),
]);
P('transporte', 'caminhao', 'Caminhão', 'frete carga logística entrega', [
  r(8, 24, 50, 38, 'N', 3),
  r(58, 34, 32, 28, 'b', 5),
  r(66, 38, 16, 11, 's', 2),
  c(24, 64, 7.5, 'd'),
  c(46, 64, 7.5, 'd'),
  c(76, 64, 7.5, 'd'),
]);
P('transporte', 'helicoptero', 'Helicóptero', 'resgate aéreo voo emergência', [
  l(18, 24, 82, 24, 'd', 4),
  l(46, 24, 46, 34, 'd', 3.5),
  r(18, 34, 46, 24, 'b', 11),
  r(58, 40, 28, 7, 'B', 3.5),
  r(26, 40, 12, 11, 's', 3),
  l(24, 68, 62, 68, 'd', 3.5),
  l(32, 58, 32, 68, 'd', 3),
  l(54, 58, 54, 68, 'd', 3),
]);
P('transporte', 'posto', 'Bomba de combustível', 'abastecer gasolina energia posto', [
  r(22, 8, 34, 60, 'N', 4),
  r(28, 14, 22, 15, 'b', 2),
  k('M56 28H68V54a6 6 0 0 0 12 0V34', 'd', 4),
  r(18, 68, 42, 5, 'd', 2),
]);

/* ---- Comunicação ---- */
P('comunicacao', 'fala', 'Balão de fala', 'conversa mensagem diálogo comentário', [
  r(10, 12, 80, 44, 'b', 11),
  g([28, 52, 28, 72, 46, 54], 'b'),
  c(32, 34, 4.5, 'w'),
  c(50, 34, 4.5, 'w'),
  c(68, 34, 4.5, 'w'),
]);
P('comunicacao', 'email', 'Envelope', 'e-mail carta mensagem newsletter', [
  r(10, 20, 80, 50, 'n', 5),
  k('M12 24L50 52L88 24', 'N', 4.5),
  c(80, 22, 9, 'b'),
]);
P('comunicacao', 'telefone', 'Telefone', 'ligação atendimento suporte contato', [
  k('M22 58Q22 26 50 26Q78 26 78 58', 'b', 15),
  r(12, 52, 17, 16, 'd', 3),
  r(71, 52, 17, 16, 'd', 3),
]);
P('comunicacao', 'sino', 'Sino de notificação', 'aviso alerta lembrete alarme', [
  a('M32 54C32 36 35 18 50 18C65 18 68 36 68 54L76 62H24Z', 'b'),
  c(50, 68, 5.5, 'd'),
  c(50, 14, 4, 'd'),
  c(70, 22, 8, 'B'),
]);
P('comunicacao', 'torre', 'Torre de sinal', 'antena rádio transmissão cobertura', [
  l(50, 16, 38, 72, 'd', 4),
  l(50, 16, 62, 72, 'd', 4),
  l(42, 48, 58, 48, 'd', 3),
  l(40, 60, 60, 60, 'd', 3),
  c(50, 14, 5.5, 'b'),
  k('M34 18Q26 30 34 42', 'b', 4.5),
  k('M24 12Q10 30 24 48', 'b', 4.5),
  k('M66 18Q74 30 66 42', 'b', 4.5),
  k('M76 12Q90 30 76 48', 'b', 4.5),
]);
P('comunicacao', 'hashtag', 'Hashtag', 'redes sociais tendência tema marcação', [
  l(40, 14, 32, 68, 'b', 6.5),
  l(62, 14, 54, 68, 'b', 6.5),
  l(18, 33, 82, 33, 'd', 6.5),
  l(16, 52, 80, 52, 'd', 6.5),
]);
P('comunicacao', 'curtir', 'Curtir', 'aprovação reação engajamento polegar', [
  r(14, 38, 16, 32, 'N', 3),
  a('M34 42L46 14C56 14 60 24 56 36H78C83 36 85 42 83 47L78 64C77 68 74 70 70 70H34Z', 'b'),
]);
P('comunicacao', 'conversa', 'Conversa', 'chat diálogo atendimento suporte', [
  r(10, 10, 52, 34, 'b', 9),
  g([20, 40, 20, 56, 34, 42], 'b'),
  r(38, 34, 52, 32, 'N', 9),
  l(18, 22, 54, 22, 'w', 3.5),
  l(18, 31, 42, 31, 'w', 3.5),
  l(46, 46, 80, 46, 'w', 3.5),
  l(46, 55, 70, 55, 'w', 3.5),
]);
P('comunicacao', 'video', 'Vídeo', 'aula reprodução streaming conteúdo', [
  r(10, 16, 80, 50, 'N', 9),
  c(50, 41, 16, 'b'),
  g([45, 33, 45, 49, 59, 41], 'w'),
]);
P('comunicacao', 'rede', 'Rede de contatos', 'conexões comunidade networking relacionamento', [
  l(50, 16, 24, 62, 'd', 3),
  l(50, 16, 76, 62, 'd', 3),
  l(24, 62, 76, 62, 'd', 3),
  l(50, 40, 50, 16, 'b', 3),
  c(50, 16, 9, 'b'),
  c(24, 62, 9, 'b'),
  c(76, 62, 9, 'b'),
  c(50, 42, 6.5, 'd'),
]);

/* ---- Arte e design ---- */
P('arte', 'paleta', 'Paleta de tintas', 'pintura cores criatividade artista', [
  e(50, 42, 38, 28, 'n'),
  c(32, 36, 6.5, 'b'),
  c(48, 24, 6.5, 's'),
  c(66, 28, 6.5, 'B'),
  c(74, 48, 6.5, 'N'),
  c(38, 58, 7.5, 'w'),
]);
P('arte', 'pincel', 'Pincel', 'pintar ilustração cor ateliê', [
  T(35, 50, 40, [
    r(46, 4, 8, 38, 'N', 3),
    r(45, 40, 10, 9, 'd', 1),
    a('M45 50H55C55 62 50 70 50 70C50 70 45 62 45 50Z', 'b'),
  ]),
]);
P('arte', 'cavalete', 'Cavalete com tela', 'quadro pintura exposição obra', [
  l(36, 50, 26, 74, 'd', 3.5),
  l(64, 50, 74, 74, 'd', 3.5),
  l(50, 50, 50, 74, 'd', 3.5),
  r(20, 8, 60, 42, 'n', 2),
  g([26, 44, 42, 24, 58, 44], 'b'),
  g([44, 44, 60, 30, 74, 44], 'B'),
  c(66, 18, 4.5, 's'),
]);
P('arte', 'tinta', 'Balde de tinta', 'reforma cor pintura parede', [
  k('M26 32A24 22 0 0 1 74 32', 'd', 3.5),
  r(26, 30, 48, 40, 'N', 4),
  r(26, 30, 48, 10, 'b', 4),
  c(38, 46, 3.5, 'b'),
  r(36, 40, 5, 12, 'b', 2.5),
]);
P('arte', 'mascara', 'Máscara de teatro', 'teatro drama expressão performance', [
  a('M12 18H88V42C88 60 70 70 50 70C30 70 12 60 12 42Z', 'b'),
  e(34, 38, 7, 5.5, 'w'),
  e(66, 38, 7, 5.5, 'w'),
  k('M34 52Q50 64 66 52', 'w', 3.5),
]);
P('arte', 'caneta', 'Ponta de caneta', 'caligrafia desenho escrita tinta', [
  g([50, 8, 72, 42, 60, 56, 40, 56, 28, 42], 'N'),
  l(50, 28, 50, 54, 'n', 2.5),
  c(50, 36, 3.5, 'w'),
  r(44, 56, 12, 14, 'd', 2),
]);
P('arte', 'claquete', 'Claquete', 'cinema filme produção vídeo', [
  r(12, 36, 76, 36, 'N', 3),
  r(12, 22, 76, 12, 'd', 2),
  ...[18, 34, 50, 66].map((x) => g([x, 34, x + 8, 34, x + 14, 22, x + 6, 22], 'w')),
]);
P('arte', 'vaso', 'Vaso de cerâmica', 'artesanato escultura decoração barro', [
  a('M38 10H62C62 24 76 28 76 46C76 62 66 72 50 72C34 72 24 62 24 46C24 28 38 24 38 10Z', 'b'),
  k('M28 40H72', 's', 4.5),
  k('M30 54H70', 's', 3),
]);
P('arte', 'cromatico', 'Círculo cromático', 'cores harmonia design paleta', [
  wedge(50, 42, 30, -90, -30, 'b'),
  wedge(50, 42, 30, -30, 30, 'B'),
  wedge(50, 42, 30, 30, 90, 's'),
  wedge(50, 42, 30, 90, 150, 'N'),
  wedge(50, 42, 30, 150, 210, 'd'),
  wedge(50, 42, 30, 210, 270, 'n'),
  c(50, 42, 8, 'w'),
]);
P('arte', 'compasso', 'Compasso', 'desenho técnico geometria projeto precisão', [
  l(50, 12, 30, 72, 'd', 4.5),
  l(50, 12, 70, 72, 'd', 4.5),
  l(38, 48, 62, 48, 'b', 3.5),
  c(50, 12, 6, 'b'),
]);

/* ---- Energia ---- */
P('energia', 'raio', 'Raio', 'eletricidade potência rápido força', [
  g([58, 6, 22, 44, 44, 44, 36, 72, 78, 30, 54, 30], 'b'),
]);
P('energia', 'bateria', 'Bateria', 'carga autonomia energia armazenar', [
  r(16, 24, 62, 36, 'N', 5),
  r(78, 34, 7, 16, 'd', 2),
  r(21, 29, 13, 26, 'b', 2),
  r(37, 29, 13, 26, 'b', 2),
  r(53, 29, 13, 26, 's', 2),
]);
P('energia', 'solar', 'Painel solar', 'energia renovável sustentável placa', [
  g([22, 20, 78, 20, 90, 54, 10, 54], 'b'),
  l(41, 20, 37, 54, 'w', 2),
  l(59, 20, 63, 54, 'w', 2),
  l(16, 37, 84, 37, 'w', 2),
  l(50, 54, 50, 68, 'd', 4),
  r(36, 68, 28, 4, 'N', 2),
]);
P('energia', 'eolica', 'Turbina eólica', 'vento renovável limpa geração', [
  g([47, 36, 53, 36, 55, 72, 45, 72], 'N'),
  T(0, 50, 32, [g([47, 30, 53, 30, 50, 4], 'b')]),
  T(120, 50, 32, [g([47, 30, 53, 30, 50, 4], 'b')]),
  T(240, 50, 32, [g([47, 30, 53, 30, 50, 4], 'b')]),
  c(50, 32, 5, 'd'),
]);
P('energia', 'torre', 'Torre de transmissão', 'rede elétrica distribuição linha alta-tensão', [
  l(50, 8, 34, 72, 'd', 3.5),
  l(50, 8, 66, 72, 'd', 3.5),
  l(36, 26, 64, 26, 'd', 3.5),
  l(40, 44, 60, 44, 'd', 3.5),
  l(38, 26, 58, 44, 'N', 2),
  l(62, 26, 42, 44, 'N', 2),
  c(30, 26, 3, 'b'),
  c(70, 26, 3, 'b'),
]);
P('energia', 'plugue', 'Plugue', 'tomada conexão ligar instalação', [
  r(40, 8, 5, 22, 'd', 1.5),
  r(55, 8, 5, 22, 'd', 1.5),
  r(30, 30, 40, 28, 'b', 8),
  l(50, 58, 50, 74, 'd', 7),
]);
P('energia', 'fogo', 'Chama', 'calor combustão gás queima', [
  a(
    'M50 6C58 24 78 34 78 52C78 66 66 72 50 72C34 72 22 66 22 52C22 40 30 36 33 24C40 32 44 28 50 6Z',
    'b',
  ),
  a('M50 38C54 48 64 52 64 60C64 66 58 70 50 70C42 70 36 66 36 60C36 52 46 48 50 38Z', 's'),
]);
P('energia', 'gotaenergia', 'Gota de energia', 'hidrogênio limpa hidrelétrica biocombustível', [
  a(DROP, 'b'),
  g([55, 28, 38, 52, 48, 52, 44, 68, 63, 42, 52, 42], 'w'),
]);
P('energia', 'medidor', 'Medidor', 'consumo indicador nível desempenho', [
  a('M10 62A40 40 0 0 1 90 62Z', 'n'),
  k('M18 60A32 32 0 0 1 82 60', 'b', 7),
  l(50, 60, 68, 34, 'd', 3.5),
  c(50, 60, 6, 'd'),
]);
P('energia', 'ciclo', 'Ciclo', 'reciclagem reaproveitamento sustentabilidade circular', [
  ...[0, 120, 240].flatMap((k) => cycleArrow(50, 42, 26, k - 70, k + 20)),
  c(50, 42, 4, 's'),
]);

/* ---- Espaço ---- */
P('espaco', 'foguete', 'Foguete', 'lançamento missão startup impulso', [
  a('M50 6C65 20 66 48 58 62H42C34 48 35 20 50 6Z', 'n'),
  c(50, 30, 7, 'b'),
  g([42, 48, 28, 64, 42, 62], 'b'),
  g([58, 48, 72, 64, 58, 62], 'b'),
  g([45, 63, 55, 63, 50, 78], 's'),
]);
P('espaco', 'planeta', 'Planeta com anel', 'saturno astronomia sistema solar', [
  c(50, 42, 21, 'b'),
  T(-20, 50, 42, [q(50, 42, 38, 10, 'd', 4.5)]),
  e(44, 36, 6, 3.5, 's'),
]);
P('espaco', 'lua', 'Lua', 'satélite noite cratera astronomia', [
  c(50, 42, 29, 'n'),
  c(38, 32, 6, 'N'),
  c(60, 52, 8, 'N'),
  c(58, 26, 3.8, 'N'),
  c(36, 54, 3.2, 'N'),
]);
P('espaco', 'cadente', 'Estrela cadente', 'meteoro desejo brilho céu', [
  g([28, 44, 86, 14, 56, 64], 's'),
  st(36, 46, 17, 7.5, 'b'),
]);
P('espaco', 'capacete', 'Capacete de astronauta', 'astronauta missão exploração espacial', [
  r(30, 60, 40, 12, 'N', 4),
  c(50, 38, 27, 'n'),
  e(50, 38, 19, 15, 'd'),
  e(43, 33, 5.5, 3.5, 's'),
  r(21, 36, 5, 14, 'b', 2),
  r(74, 36, 5, 14, 'b', 2),
]);
P('espaco', 'satelite', 'Satélite', 'órbita comunicação sinal gps', [
  T(-25, 50, 42, [
    r(40, 32, 20, 20, 'N', 3),
    r(8, 34, 28, 16, 'b', 2),
    r(64, 34, 28, 16, 'b', 2),
    l(36, 42, 40, 42, 'd', 2.5),
    l(60, 42, 64, 42, 'd', 2.5),
    l(50, 32, 50, 20, 'd', 3),
    c(50, 18, 5, 'b'),
  ]),
]);
P('espaco', 'constelacao', 'Constelação', 'estrelas astronomia céu noturno mapa', [
  l(20, 52, 38, 30, 'N', 2),
  l(38, 30, 58, 40, 'N', 2),
  l(58, 40, 74, 18, 'N', 2),
  l(58, 40, 80, 56, 'N', 2),
  hx(20, 52, 6, 'b'),
  hx(38, 30, 7, 'b'),
  hx(58, 40, 7.5, 'B'),
  hx(74, 18, 6, 'b'),
  hx(80, 56, 6.5, 's'),
]);
P('espaco', 'ovni', 'Disco voador', 'alienígena mistério ufo ficção', [
  g([40, 54, 60, 54, 72, 74, 28, 74], 's'),
  a('M34 40A16 16 0 0 1 66 40Z', 'n'),
  e(50, 44, 37, 10, 'N'),
  c(28, 46, 3.5, 'b'),
  c(50, 50, 3.5, 'b'),
  c(72, 46, 3.5, 'b'),
]);
P('espaco', 'cometa', 'Cometa', 'astro cauda céu passagem', [
  g([30, 36, 90, 12, 52, 62], 's'),
  g([36, 40, 90, 12, 54, 56], 'n'),
  c(34, 50, 13, 'b'),
  c(30, 46, 3.5, 's'),
]);
P('espaco', 'terra', 'Planeta Terra', 'mundo globo ambiente global', [
  c(50, 42, 29, 'b'),
  e(40, 34, 11, 8, 's'),
  e(62, 54, 9, 13, 's'),
  e(66, 30, 5.5, 4, 's'),
  e(34, 56, 6, 4.5, 's'),
]);

/* ---- Genéricas (complemento; sem base) ---- */
const G = (id: string, name: string, tags: string, shapes: Shape[]) =>
  P('generico', id, name, tags, shapes, { ped: false });
G('seta', 'Seta', 'direção avançar próximo fluxo', [
  r(12, 33, 48, 18, 'b', 4),
  g([56, 16, 90, 42, 56, 68], 'b'),
]);
G('check', 'Confirmação', 'certo correto concluído aprovado', [
  hx(50, 42, 34, 'b'),
  k('M33 42l12 12 22-24', 'w', 7),
]);
G('fechar', 'Negação', 'errado erro cancelar proibido', [
  hx(50, 42, 34, 'B'),
  k('M37 29L63 55M63 29L37 55', 'w', 7),
]);
G('pergunta', 'Pergunta', 'dúvida questão faq incerteza', [
  hx(50, 42, 34, 'b'),
  k('M39 34a11 11 0 0 1 22 0c0 9-11 9-11 17', 'w', 6),
  c(50, 61, 4, 'w'),
]);
G('alerta', 'Alerta', 'atenção importante cuidado aviso', [
  hx(50, 42, 34, 'B'),
  l(50, 26, 50, 46, 'w', 6.5),
  c(50, 58, 4, 'w'),
]);
G('estrela', 'Estrela', 'destaque favorito avaliação qualidade', [st(50, 44, 34, 15, 'b')]);
G('relogio', 'Relógio', 'tempo prazo duração hora', [
  c(50, 42, 32, 'N'),
  c(50, 42, 26, 'n'),
  l(50, 42, 50, 24, 'd', 4),
  l(50, 42, 65, 51, 'b', 4),
  c(50, 42, 3.5, 'd'),
]);
G('engrenagem', 'Engrenagem', 'processo configuração mecanismo ajuste', [
  ...[0, 45, 90, 135].map((rot) => T(rot, 50, 42, [r(43, 8, 14, 68, 'b', 3)])),
  c(50, 42, 22, 'b'),
  c(50, 42, 9, 'w'),
]);
G('pessoa', 'Pessoa', 'usuário cliente indivíduo perfil', [
  c(50, 24, 14, 'b'),
  a('M22 74C22 50 35 42 50 42C65 42 78 50 78 74Z', 'b'),
]);
G('documento', 'Documento', 'texto relatório arquivo papel', [
  r(24, 8, 52, 66, 'n', 4),
  l(33, 24, 67, 24, 'b', 4.5),
  l(33, 36, 67, 36, 'N', 4),
  l(33, 47, 67, 47, 'N', 4),
  l(33, 58, 54, 58, 'N', 4),
]);
G('lupa', 'Lupa', 'busca análise detalhe investigar', [
  o(42, 38, 22, 'd', 6.5),
  c(42, 38, 18, 's'),
  l(58, 54, 80, 74, 'd', 9),
]);
G('link', 'Corrente', 'conexão relação ligação união', [
  k('M26 28H44A14 14 0 0 1 44 56H26A14 14 0 0 1 26 28Z', 'b', 6.5),
  k('M56 28H74A14 14 0 0 1 74 56H56A14 14 0 0 1 56 28Z', 'd', 6.5),
  l(44, 42, 56, 42, 'N', 6.5),
]);
G('bandeira', 'Bandeira', 'marco meta objetivo etapa', [
  l(28, 8, 28, 74, 'd', 4.5),
  g([31, 12, 80, 12, 68, 27, 80, 42, 31, 42], 'b'),
]);
G('coracao', 'Coração', 'amor cuidado favorito afeto', [a(HEART, 'b')]);
G('mais', 'Adicionar', 'mais novo incluir somar', [
  r(41, 12, 18, 60, 'b', 3),
  r(20, 33, 60, 18, 'b', 3),
]);
G('brilho', 'Brilho', 'novidade destaque ia mágica', [
  a('M50 6Q55 36 88 42Q55 48 50 78Q45 48 12 42Q45 36 50 6Z', 'b'),
  a('M78 8Q80 18 90 20Q80 22 78 32Q76 22 66 20Q76 18 78 8Z', 's'),
]);

export const INFOGRAPHIC_PIECE_SHAPES: readonly Piece[] = PIECES_LIST;
