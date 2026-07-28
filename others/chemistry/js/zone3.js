/* ============================================================
   ZONE 03 · 化合价与化学式
   Panel A 化合价速记卡 / Panel B 中英文命名对照 / Panel C 元素拼配台
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 数据：化合价口诀卡 ---------------- */
  const MNEMONIC_CARDS = [
    { tag: '口诀 ①', front: '一价钾钠氯氢银', back: [['K', '+1'], ['Na', '+1'], ['Cl', '−1'], ['H', '+1'], ['Ag', '+1']] },
    { tag: '口诀 ②', front: '二价氧钙钡镁锌', back: [['O', '−2'], ['Ca', '+2'], ['Ba', '+2'], ['Mg', '+2'], ['Zn', '+2']] },
    { tag: '口诀 ③', front: '三铝四硅五价磷', back: [['Al', '+3'], ['Si', '+4'], ['P', '+5']] },
    { tag: '口诀 ④', front: '二三铁、二四碳', back: [['Fe', '+2、+3'], ['C', '+2、+4']] },
    { tag: '口诀 ⑤', front: '铜汞二价最常见', back: [['Cu', '+2'], ['Hg', '+2']] },
    { tag: '原子团', front: '氢氧根 OH', back: [['OH', '−1']] },
    { tag: '原子团', front: '硝酸根 NO₃', back: [['NO₃', '−1']] },
    { tag: '原子团', front: '硫酸根 SO₄', back: [['SO₄', '−2']] },
    { tag: '原子团', front: '碳酸根 CO₃', back: [['CO₃', '−2']] },
    { tag: '原子团', front: '铵根 NH₄', back: [['NH₄', '+1']] }
  ];

  /* ---------------- 数据：中英文命名对照卡 ---------------- */
  const NAME_CARDS = [
    { cn: '氯化钠', formula: 'NaCl', en: 'sodium chloride', root: 'chloride = 氯（chlor-）+ 后缀 -ide' },
    { cn: '氧化铜', formula: 'CuO', en: 'copper oxide', root: 'oxide = 氧（ox-）+ 后缀 -ide' },
    { cn: '氢氧化钙', formula: 'Ca(OH)2', en: 'calcium hydroxide', root: 'hydroxide = 氢氧根' },
    { cn: '碳酸钙', formula: 'CaCO3', en: 'calcium carbonate', root: 'carbonate = 碳酸根（-ate 后缀）' },
    { cn: '硫酸铜', formula: 'CuSO4', en: 'copper sulfate', root: 'sulfate = 硫酸根（-ate 后缀）' }
  ];

  /* ---------------- 数据：微粒圆片 ---------------- */
  const GROUPS = { OH: 1, NO3: 1, SO4: 1, CO3: 1, NH4: 1 };
  const PARTICLES = [
    { sym: 'H', role: 'p', val: '+1' }, { sym: 'C', role: 'p', val: '+2、+4' },
    { sym: 'S', role: 'p', val: '+4、+6' }, { sym: 'Na', role: 'p', val: '+1' },
    { sym: 'K', role: 'p', val: '+1' }, { sym: 'Ca', role: 'p', val: '+2' },
    { sym: 'Mg', role: 'p', val: '+2' }, { sym: 'Al', role: 'p', val: '+3' },
    { sym: 'Fe', role: 'p', val: '+2、+3' }, { sym: 'Cu', role: 'p', val: '+2' },
    { sym: 'Zn', role: 'p', val: '+2' }, { sym: 'NH4', role: 'p', val: '+1' },
    { sym: 'O', role: 'n', val: '−2' }, { sym: 'N', role: 'n', val: '−3' },
    { sym: 'Cl', role: 'n', val: '−1' }, { sym: 'OH', role: 'n', val: '−1' },
    { sym: 'NO3', role: 'n', val: '−1' }, { sym: 'SO4', role: 'n', val: '−2' },
    { sym: 'CO3', role: 'n', val: '−2' }
  ];
  const POS_IDS = PARTICLES.filter(p => p.role === 'p').map(p => p.sym);
  const NEG_IDS = PARTICLES.filter(p => p.role === 'n').map(p => p.sym);

  /* ---------------- 化合价交叉推导（供数据与 UI 共用） ---------------- */
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function side(sym, sub) {
    if (sub <= 1) return sym;
    return GROUPS[sym] ? '(' + sym + ')' + sub : sym + sub;
  }
  /* 按"标价 → 交叉 → 约简"自动推化学式（原子团个数 >1 自动加括号） */
  function deriveFormula(p, n) {
    const g = gcd(p[1], n[1]);
    return side(p[0], n[1] / g) + side(n[0], p[1] / g);
  }

  /* ---------------- 数据：物质图鉴（A 档 58 张 + B 档 20 张，共 78 张） ---------------- */
  /* tier: 'A' = 初中常见；'B' = 真实存在但超出初中（拓展卡，琥珀色）
     p/n 用于化合价交叉自动推导；steps 为特例卡的自定义推导（无法用交叉法的物质） */
  const CARDS = [
    /* ===== A 档 · 氧化物 ===== */
    { id: 'H2O', tier: 'A', formula: 'H2O', name: '水', emoji: '💧', use: '生命之源，最常见的溶剂。', p: ['H', 1], n: ['O', 2] },
    { id: 'Na2O', tier: 'A', formula: 'Na2O', name: '氧化钠', emoji: '🤍', use: '白色固体，能与水剧烈反应生成氢氧化钠。', p: ['Na', 1], n: ['O', 2] },
    { id: 'K2O', tier: 'A', formula: 'K2O', name: '氧化钾', emoji: '⬜', use: '白色固体，与水反应生成氢氧化钾。', p: ['K', 1], n: ['O', 2] },
    { id: 'CaO', tier: 'A', formula: 'CaO', name: '氧化钙', emoji: '🏗️', use: '俗称生石灰，常用作干燥剂。', p: ['Ca', 2], n: ['O', 2] },
    { id: 'MgO', tier: 'A', formula: 'MgO', name: '氧化镁', emoji: '✨', use: '耐高温材料；镁条燃烧生成的白色固体就是它。', p: ['Mg', 2], n: ['O', 2] },
    { id: 'ZnO', tier: 'A', formula: 'ZnO', name: '氧化锌', emoji: '🧴', use: '俗称锌白，可用作白色颜料。', p: ['Zn', 2], n: ['O', 2] },
    { id: 'CuO', tier: 'A', formula: 'CuO', name: '氧化铜', emoji: '⚫', use: '黑色粉末，实验室常用它来检验氢气的还原性。', p: ['Cu', 2], n: ['O', 2] },
    { id: 'FeO', tier: 'A', formula: 'FeO', name: '氧化亚铁', emoji: '⬛', use: '黑色粉末，其中铁显 +2 价。', p: ['Fe', 2], n: ['O', 2] },
    { id: 'Fe2O3', tier: 'A', formula: 'Fe2O3', name: '氧化铁', emoji: '🟤', use: '铁锈的主要成分，也是赤铁矿的主要成分。', p: ['Fe', 3], n: ['O', 2] },
    { id: 'Al2O3', tier: 'A', formula: 'Al2O3', name: '氧化铝', emoji: '💎', use: '铝表面的致密保护膜，也是刚玉的主要成分。', p: ['Al', 3], n: ['O', 2] },
    { id: 'CO', tier: 'A', formula: 'CO', name: '一氧化碳', emoji: '⚠️', use: '煤气的主要成分之一，有剧毒，也可作燃料。', p: ['C', 2], n: ['O', 2] },
    { id: 'CO2', tier: 'A', formula: 'CO2', name: '二氧化碳', emoji: '🥤', use: '汽水里的气泡就是它，也可用于灭火。', p: ['C', 4], n: ['O', 2] },
    { id: 'SO2', tier: 'A', formula: 'SO2', name: '二氧化硫', emoji: '🌋', use: '有刺激性气味，是形成酸雨的主要物质之一。', p: ['S', 4], n: ['O', 2] },
    /* ===== A 档 · 氯化物 ===== */
    { id: 'HCl', tier: 'A', formula: 'HCl', name: '氯化氢', emoji: '🧫', use: '其水溶液是盐酸，可用于金属表面除锈。', p: ['H', 1], n: ['Cl', 1] },
    { id: 'NaCl', tier: 'A', formula: 'NaCl', name: '氯化钠', emoji: '🧂', use: '食盐的主要成分，厨房必备调味品。', p: ['Na', 1], n: ['Cl', 1] },
    { id: 'KCl', tier: 'A', formula: 'KCl', name: '氯化钾', emoji: '🌱', use: '常用的钾肥，为庄稼补充钾元素。', p: ['K', 1], n: ['Cl', 1] },
    { id: 'NH4Cl', tier: 'A', formula: 'NH4Cl', name: '氯化铵', emoji: '🌾', use: '一种常见的铵态氮肥。', p: ['NH4', 1], n: ['Cl', 1] },
    { id: 'CaCl2', tier: 'A', formula: 'CaCl2', name: '氯化钙', emoji: '🧊', use: '容易吸收水分，常用作干燥剂。', p: ['Ca', 2], n: ['Cl', 1] },
    { id: 'MgCl2', tier: 'A', formula: 'MgCl2', name: '氯化镁', emoji: '🌊', use: '存在于海水中，是海水提镁的重要原料。', p: ['Mg', 2], n: ['Cl', 1] },
    { id: 'ZnCl2', tier: 'A', formula: 'ZnCl2', name: '氯化锌', emoji: '🔩', use: '其溶液可作焊接金属时的助焊剂。', p: ['Zn', 2], n: ['Cl', 1] },
    { id: 'CuCl2', tier: 'A', formula: 'CuCl2', name: '氯化铜', emoji: '💠', use: '其水溶液呈蓝绿色。', p: ['Cu', 2], n: ['Cl', 1] },
    { id: 'FeCl2', tier: 'A', formula: 'FeCl2', name: '氯化亚铁', emoji: '🟢', use: '其水溶液呈浅绿色，铁显 +2 价。', p: ['Fe', 2], n: ['Cl', 1] },
    { id: 'FeCl3', tier: 'A', formula: 'FeCl3', name: '氯化铁', emoji: '🟡', use: '其水溶液呈黄色，铁显 +3 价。', p: ['Fe', 3], n: ['Cl', 1] },
    { id: 'AlCl3', tier: 'A', formula: 'AlCl3', name: '氯化铝', emoji: '⚪', use: '铝与氯气反应的产物，可溶于水。', p: ['Al', 3], n: ['Cl', 1] },
    /* ===== A 档 · 氢氧化物 / 碱 ===== */
    { id: 'NaOH', tier: 'A', formula: 'NaOH', name: '氢氧化钠', emoji: '🧼', use: '俗称火碱、烧碱，可去除油污、制肥皂。', p: ['Na', 1], n: ['OH', 1] },
    { id: 'KOH', tier: 'A', formula: 'KOH', name: '氢氧化钾', emoji: '🧪', use: '强碱，有强腐蚀性，可用于制造钾肥皂。', p: ['K', 1], n: ['OH', 1] },
    { id: 'CaOH2', tier: 'A', formula: 'Ca(OH)2', name: '氢氧化钙', emoji: '🧱', use: '俗称熟石灰，可改良酸性土壤、粉刷墙壁。', p: ['Ca', 2], n: ['OH', 1] },
    { id: 'MgOH2', tier: 'A', formula: 'Mg(OH)2', name: '氢氧化镁', emoji: '💊', use: '白色难溶固体，可用于中和胃酸。', p: ['Mg', 2], n: ['OH', 1] },
    { id: 'ZnOH2', tier: 'A', formula: 'Zn(OH)2', name: '氢氧化锌', emoji: '🤍', use: '白色难溶固体。', p: ['Zn', 2], n: ['OH', 1] },
    { id: 'CuOH2', tier: 'A', formula: 'Cu(OH)2', name: '氢氧化铜', emoji: '🟦', use: '蓝色絮状沉淀，受热易分解生成黑色的氧化铜。', p: ['Cu', 2], n: ['OH', 1] },
    { id: 'FeOH3', tier: 'A', formula: 'Fe(OH)3', name: '氢氧化铁', emoji: '🟫', use: '红褐色沉淀，铁显 +3 价。', p: ['Fe', 3], n: ['OH', 1] },
    { id: 'AlOH3', tier: 'A', formula: 'Al(OH)3', name: '氢氧化铝', emoji: '🍮', use: '白色胶状沉淀，可用于中和胃酸。', p: ['Al', 3], n: ['OH', 1] },
    {
      id: 'NH3H2O', tier: 'A', formula: 'NH3·H2O', name: '一水合氨', emoji: '🌬️',
      use: '氨水的主要成分，能使酚酞溶液变红；浓氨水有强烈的刺激性气味。',
      steps: [
        '标价：NH₄ 显 +1 价，OH 显 −1 价',
        '交叉：NH₄ 1 个、OH 1 个 → NH₄OH（旧称"氢氧化铵"）',
        '说明：现代教材认为氨水中主要存在一水合氨，规范写作 NH₃·H₂O',
        '检验：(+1)×1 + (−1)×1 = 0 ✓ 正负化合价代数和为零'
      ]
    },
    /* ===== A 档 · 硝酸盐 ===== */
    { id: 'HNO3', tier: 'A', formula: 'HNO3', name: '硝酸', emoji: '💥', use: '重要的酸，可用于制造化肥。', p: ['H', 1], n: ['NO3', 1] },
    { id: 'NaNO3', tier: 'A', formula: 'NaNO3', name: '硝酸钠', emoji: '🌿', use: '一种含氮的盐，可用作氮肥。', p: ['Na', 1], n: ['NO3', 1] },
    { id: 'KNO3', tier: 'A', formula: 'KNO3', name: '硝酸钾', emoji: '🌻', use: '含钾、氮两种营养元素，是一种复合肥。', p: ['K', 1], n: ['NO3', 1] },
    { id: 'NH4NO3', tier: 'A', formula: 'NH4NO3', name: '硝酸铵', emoji: '🌾', use: '铵态氮肥，含氮量较高。', p: ['NH4', 1], n: ['NO3', 1] },
    { id: 'CuNO32', tier: 'A', formula: 'Cu(NO3)2', name: '硝酸铜', emoji: '💙', use: '其水溶液呈蓝色。', p: ['Cu', 2], n: ['NO3', 1] },
    { id: 'AlNO33', tier: 'A', formula: 'Al(NO3)3', name: '硝酸铝', emoji: '🔹', use: '可溶于水的铝盐。', p: ['Al', 3], n: ['NO3', 1] },
    /* ===== A 档 · 硫酸盐 ===== */
    { id: 'H2SO4', tier: 'A', formula: 'H2SO4', name: '硫酸', emoji: '🔋', use: '铅蓄电池里的电解液，重要的化工原料。', p: ['H', 1], n: ['SO4', 2] },
    { id: 'Na2SO4', tier: 'A', formula: 'Na2SO4', name: '硫酸钠', emoji: '🏭', use: '俗称元明粉，用于玻璃、造纸等工业。', p: ['Na', 1], n: ['SO4', 2] },
    { id: 'K2SO4', tier: 'A', formula: 'K2SO4', name: '硫酸钾', emoji: '🌿', use: '常用的钾肥，可增强作物抗倒伏能力。', p: ['K', 1], n: ['SO4', 2] },
    { id: 'NH42SO4', tier: 'A', formula: '(NH4)2SO4', name: '硫酸铵', emoji: '🌾', use: '俗称硫铵，常用的铵态氮肥。', p: ['NH4', 1], n: ['SO4', 2] },
    { id: 'CaSO4', tier: 'A', formula: 'CaSO4', name: '硫酸钙', emoji: '🗿', use: '石膏的主要成分，微溶于水。', p: ['Ca', 2], n: ['SO4', 2] },
    { id: 'MgSO4', tier: 'A', formula: 'MgSO4', name: '硫酸镁', emoji: '🛁', use: '医药上用作泻盐，也可作肥料。', p: ['Mg', 2], n: ['SO4', 2] },
    { id: 'ZnSO4', tier: 'A', formula: 'ZnSO4', name: '硫酸锌', emoji: '🔬', use: '可用作微量元素肥料（锌肥）。', p: ['Zn', 2], n: ['SO4', 2] },
    { id: 'CuSO4', tier: 'A', formula: 'CuSO4', name: '硫酸铜', emoji: '🔷', use: '无水硫酸铜是白色固体，遇水变蓝，常用来检验水；其水溶液呈蓝色。', p: ['Cu', 2], n: ['SO4', 2] },
    { id: 'FeSO4', tier: 'A', formula: 'FeSO4', name: '硫酸亚铁', emoji: '🍵', use: '其水溶液呈浅绿色，可用于制补血剂。', p: ['Fe', 2], n: ['SO4', 2] },
    { id: 'Al2SO43', tier: 'A', formula: 'Al2(SO4)3', name: '硫酸铝', emoji: '🚰', use: '常用净水剂的原料，可溶于水。', p: ['Al', 3], n: ['SO4', 2] },
    /* ===== A 档 · 碳酸盐 ===== */
    { id: 'H2CO3', tier: 'A', formula: 'H2CO3', name: '碳酸', emoji: '🫧', use: '二氧化碳溶于水生成碳酸，让汽水有了"杀口"感。', p: ['H', 1], n: ['CO3', 2] },
    { id: 'Na2CO3', tier: 'A', formula: 'Na2CO3', name: '碳酸钠', emoji: '🧽', use: '俗称纯碱，广泛用于玻璃、造纸和洗涤剂。', p: ['Na', 1], n: ['CO3', 2] },
    { id: 'K2CO3', tier: 'A', formula: 'K2CO3', name: '碳酸钾', emoji: '🪵', use: '草木灰的主要成分，可用作钾肥。', p: ['K', 1], n: ['CO3', 2] },
    { id: 'NH42CO3', tier: 'A', formula: '(NH4)2CO3', name: '碳酸铵', emoji: '🍞', use: '容易分解放出氨气，可作食品发酵粉。', p: ['NH4', 1], n: ['CO3', 2] },
    { id: 'CaCO3', tier: 'A', formula: 'CaCO3', name: '碳酸钙', emoji: '🏛️', use: '大理石、石灰石的主要成分，重要的建筑材料。', p: ['Ca', 2], n: ['CO3', 2] },
    { id: 'MgCO3', tier: 'A', formula: 'MgCO3', name: '碳酸镁', emoji: '🧗', use: '白色固体，是运动员防滑"镁粉"的主要成分。', p: ['Mg', 2], n: ['CO3', 2] },
    { id: 'ZnCO3', tier: 'A', formula: 'ZnCO3', name: '碳酸锌', emoji: '🏔️', use: '炉甘石的主要成分，可用于配制皮肤药剂。', p: ['Zn', 2], n: ['CO3', 2] },
    /* ===== A 档 · 其他 ===== */
    {
      id: 'NH3', tier: 'A', formula: 'NH3', name: '氨气', emoji: '💨', use: '有刺激性气味，是制造氮肥的重要原料。',
      steps: [
        '标价：氨气中 N 显 −3 价，H 显 +1 价',
        '交叉：N 1 个、H 3 个；按习惯把氮写在前面 → NH₃',
        '说明：氨气是"正价在前"的常见例外，按教材写法 NH₃ 记忆',
        '检验：(−3)×1 + (+1)×3 = 0 ✓ 正负化合价代数和为零'
      ]
    },
    {
      id: 'Cu2OH2CO3', tier: 'A', formula: 'Cu2(OH)2CO3', name: '碱式碳酸铜', emoji: '🗽',
      use: '铜绿（铜锈）的主要成分，绿色固体，受热易分解。',
      steps: [
        '碱式碳酸铜是"碱式盐"，组成里同时有 Cu²⁺、OH⁻ 和 CO₃²⁻',
        '它的组成可看作 CuCO₃·Cu(OH)₂，不能用一次交叉法直接写出',
        '记住：铜生锈生成的铜绿就是它，化学式 Cu₂(OH)₂CO₃',
        '检验：(+2)×2 + (−1)×2 + (−2)×1 = 0 ✓ 正负化合价代数和为零'
      ]
    },
    /* ===== B 档 · 真实存在但超出初中（拓展卡） ===== */
    {
      id: 'H2O2', tier: 'B', formula: 'H2O2', name: '过氧化氢', emoji: '🩹', use: '其水溶液俗称双氧水，可用于消毒杀菌。',
      steps: [
        '标价：过氧化氢中 H 显 +1 价，O 显 −1 价（过氧根中的氧为 −1 价，初中初步了解）',
        '交叉：H 2 个、O 2 个 → H₂O₂，注意不能再约简成 HO，否则不能真实表示它的分子构成',
        '检验：(+1)×2 + (−1)×2 = 0 ✓ 正负化合价代数和为零'
      ]
    },
    {
      id: 'Na2O2', tier: 'B', formula: 'Na2O2', name: '过氧化钠', emoji: '🌕',
      use: '淡黄色固体，能与二氧化碳、水反应放出氧气，用作供氧剂（呼吸面具、潜水艇）。',
      steps: [
        '标价：Na 显 +1 价，O 显 −1 价（过氧根中的氧为 −1 价）',
        '交叉：Na 2 个、O 2 个 → Na₂O₂，不能约简成 NaO，否则不符合它的真实组成',
        '检验：(+1)×2 + (−1)×2 = 0 ✓ 正负化合价代数和为零'
      ]
    },
    {
      id: 'Fe3O4', tier: 'B', formula: 'Fe3O4', name: '四氧化三铁', emoji: '🧲', use: '有磁性的黑色固体，铁丝在氧气中燃烧的产物。',
      steps: [
        '四氧化三铁中铁同时显 +2 价和 +3 价，不能用简单的交叉法写出',
        '它的组成可看作 FeO·Fe₂O₃，初中阶段作初步了解',
        '记住：铁丝在氧气中剧烈燃烧，生成的黑色固体就是 Fe₃O₄'
      ]
    },
    { id: 'SO3', tier: 'B', formula: 'SO3', name: '三氧化硫', emoji: '🌫️', use: '硫显 +6 价；与水反应生成硫酸，是工业制硫酸的中间产物。', p: ['S', 6], n: ['O', 2] },
    { id: 'CCl4', tier: 'B', formula: 'CCl4', name: '四氯化碳', emoji: '🛢️', use: '无色液体，曾是常用的有机溶剂和灭火剂，高中再学。', p: ['C', 4], n: ['Cl', 1] },
    { id: 'FeOH2', tier: 'B', formula: 'Fe(OH)2', name: '氢氧化亚铁', emoji: '⬜', use: '白色沉淀，迅速变成灰绿色，最后变成红褐色（被氧气氧化）。', p: ['Fe', 2], n: ['OH', 1] },
    { id: 'Fe2SO43', tier: 'B', formula: 'Fe2(SO4)3', name: '硫酸铁', emoji: '🟡', use: '铁显 +3 价，其水溶液呈黄色。', p: ['Fe', 3], n: ['SO4', 2] },
    { id: 'FeNO33', tier: 'B', formula: 'Fe(NO3)3', name: '硝酸铁', emoji: '🟨', use: '铁显 +3 价，其水溶液呈黄色。', p: ['Fe', 3], n: ['NO3', 1] },
    { id: 'FeNO32', tier: 'B', formula: 'Fe(NO3)2', name: '硝酸亚铁', emoji: '🟩', use: '铁显 +2 价，其水溶液呈浅绿色。', p: ['Fe', 2], n: ['NO3', 1] },
    { id: 'CuCO3', tier: 'B', formula: 'CuCO3', name: '碳酸铜', emoji: '🦚', use: '真实存在但初中少见；初中更常见的是碱式碳酸铜 Cu₂(OH)₂CO₃（铜绿）。', p: ['Cu', 2], n: ['CO3', 2] },
    { id: 'Mg3N2', tier: 'B', formula: 'Mg3N2', name: '氮化镁', emoji: '🌟', use: '镁在氮气中燃烧的产物之一，淡黄色固体，高中内容。', p: ['Mg', 2], n: ['N', 3] },
    { id: 'Ca3N2', tier: 'B', formula: 'Ca3N2', name: '氮化钙', emoji: '🔶', use: '钙与氮气反应的产物，遇水剧烈反应，高中及以上。', p: ['Ca', 2], n: ['N', 3] },
    { id: 'Na3N', tier: 'B', formula: 'Na3N', name: '氮化钠', emoji: '🧨', use: '极不稳定，遇水剧烈反应，远超初中范围。', p: ['Na', 1], n: ['N', 3] },
    { id: 'K3N', tier: 'B', formula: 'K3N', name: '氮化钾', emoji: '⚡', use: '极不稳定，遇水剧烈反应，远超初中范围。', p: ['K', 1], n: ['N', 3] },
    { id: 'Zn3N2', tier: 'B', formula: 'Zn3N2', name: '氮化锌', emoji: '🔹', use: '锌的氮化物，高中及以上才涉及。', p: ['Zn', 2], n: ['N', 3] },
    { id: 'AlN', tier: 'B', formula: 'AlN', name: '氮化铝', emoji: '🏺', use: '耐高温陶瓷材料，铝显 +3 价、氮显 −3 价，高中及以上。', p: ['Al', 3], n: ['N', 3] },
    { id: 'CaNO32', tier: 'B', formula: 'Ca(NO3)2', name: '硝酸钙', emoji: '❄️', use: '真实存在的钙盐，可用作化肥，初中少见。', p: ['Ca', 2], n: ['NO3', 1] },
    { id: 'MgNO32', tier: 'B', formula: 'Mg(NO3)2', name: '硝酸镁', emoji: '🫙', use: '可溶于水的镁盐，初中少见。', p: ['Mg', 2], n: ['NO3', 1] },
    { id: 'ZnNO32', tier: 'B', formula: 'Zn(NO3)2', name: '硝酸锌', emoji: '🪙', use: '可溶于水的锌盐，初中少见。', p: ['Zn', 2], n: ['NO3', 1] },
    { id: 'FeCO3', tier: 'B', formula: 'FeCO3', name: '碳酸亚铁', emoji: '⛏️', use: '菱铁矿的主要成分，铁显 +2 价，初中少见。', p: ['Fe', 2], n: ['CO3', 2] }
  ];
  const CARD_BY_ID = {};
  CARDS.forEach(c => { CARD_BY_ID[c.id] = c; });

  /* 数据自检：凡声明了 p/n 的卡，交叉推导结果必须与建档化学式一致 */
  CARDS.forEach(c => {
    if (c.p && c.n) {
      const d = deriveFormula(c.p, c.n);
      if (d !== c.formula && typeof console !== 'undefined') {
        console.warn('[Zone3] 化学式推导不一致：' + c.id + ' 建档=' + c.formula + ' 推导=' + d);
      }
    }
  });

  /* ---------------- 组合判定表：12 正价 × 7 负价 = 84 格，逐格建档 ---------------- */
  /* key = 正价微粒|负价微粒；值：{ cards:[卡id…], note? } 或 { reason: 具体原因 } */
  const COMBO_DB = {
    /* --- H(+1) --- */
    'H|O': { cards: ['H2O', 'H2O2'], note: '除了水，还有双氧水这张拓展卡哦。' },
    'H|Cl': { cards: ['HCl'] },
    'H|N': { cards: ['NH3'] },
    'H|OH': { cards: ['H2O'], note: 'H⁺ 与 OH⁻ 结合生成水——这正是中和反应的实质。' },
    'H|NO3': { cards: ['HNO3'] },
    'H|SO4': { cards: ['H2SO4'] },
    'H|CO3': { cards: ['H2CO3'] },
    /* --- Na(+1) --- */
    'Na|O': { cards: ['Na2O', 'Na2O2'], note: '除了氧化钠，还有供氧剂过氧化钠（拓展卡）。' },
    'Na|Cl': { cards: ['NaCl'] },
    'Na|N': { cards: ['Na3N'] },
    'Na|OH': { cards: ['NaOH'] },
    'Na|NO3': { cards: ['NaNO3'] },
    'Na|SO4': { cards: ['Na2SO4'] },
    'Na|CO3': { cards: ['Na2CO3'] },
    /* --- K(+1) --- */
    'K|O': { cards: ['K2O'] },
    'K|Cl': { cards: ['KCl'] },
    'K|N': { cards: ['K3N'] },
    'K|OH': { cards: ['KOH'] },
    'K|NO3': { cards: ['KNO3'] },
    'K|SO4': { cards: ['K2SO4'] },
    'K|CO3': { cards: ['K2CO3'] },
    /* --- NH4(+1) --- */
    'NH4|O': { reason: '铵根 NH₄⁺ 与 O²⁻ 不能构成稳定物质：氮与氢已经形成稳定的铵根，不存在"氧化铵"；铵根对应的碱是一水合氨——试试 NH₄ + OH。' },
    'NH4|Cl': { cards: ['NH4Cl'] },
    'NH4|N': { reason: '铵根本身就含有氮原子，不能再与另一个氮负离子结合，不存在"氮化铵"；想拼含氮物质，试试 H + N（氨气）。' },
    'NH4|OH': { cards: ['NH3H2O'] },
    'NH4|NO3': { cards: ['NH4NO3'] },
    'NH4|SO4': { cards: ['NH42SO4'] },
    'NH4|CO3': { cards: ['NH42CO3'] },
    /* --- Ca(+2) --- */
    'Ca|O': { cards: ['CaO'] },
    'Ca|Cl': { cards: ['CaCl2'] },
    'Ca|N': { cards: ['Ca3N2'] },
    'Ca|OH': { cards: ['CaOH2'] },
    'Ca|NO3': { cards: ['CaNO32'] },
    'Ca|SO4': { cards: ['CaSO4'] },
    'Ca|CO3': { cards: ['CaCO3'] },
    /* --- Mg(+2) --- */
    'Mg|O': { cards: ['MgO'] },
    'Mg|Cl': { cards: ['MgCl2'] },
    'Mg|N': { cards: ['Mg3N2'] },
    'Mg|OH': { cards: ['MgOH2'] },
    'Mg|NO3': { cards: ['MgNO32'] },
    'Mg|SO4': { cards: ['MgSO4'] },
    'Mg|CO3': { cards: ['MgCO3'] },
    /* --- Zn(+2) --- */
    'Zn|O': { cards: ['ZnO'] },
    'Zn|Cl': { cards: ['ZnCl2'] },
    'Zn|N': { cards: ['Zn3N2'] },
    'Zn|OH': { cards: ['ZnOH2'] },
    'Zn|NO3': { cards: ['ZnNO32'] },
    'Zn|SO4': { cards: ['ZnSO4'] },
    'Zn|CO3': { cards: ['ZnCO3'] },
    /* --- Cu(+2) --- */
    'Cu|O': { cards: ['CuO'] },
    'Cu|Cl': { cards: ['CuCl2'] },
    'Cu|N': { reason: '铜不与氮气直接化合，初中阶段没有铜的氮化物；金属氮化物（如 Mg₃N₂，可试 Mg + N）要到高中才学习。' },
    'Cu|OH': { cards: ['CuOH2'] },
    'Cu|NO3': { cards: ['CuNO32'] },
    'Cu|SO4': { cards: ['CuSO4'] },
    'Cu|CO3': { cards: ['Cu2OH2CO3', 'CuCO3'], note: '初中更常见的是铜绿（碱式碳酸铜），碳酸铜作拓展了解。' },
    /* --- Fe(+2、+3) --- */
    'Fe|O': { cards: ['FeO', 'Fe2O3', 'Fe3O4'], note: '铁有两种常见化合价，还有铁丝燃烧的产物 Fe₃O₄，共三张卡！' },
    'Fe|Cl': { cards: ['FeCl2', 'FeCl3'] },
    'Fe|N': { reason: '铁在初中条件下不与氮形成稳定氮化物（铁在空气中燃烧主要生成 Fe₃O₄，可试 Fe + O）。' },
    'Fe|OH': { cards: ['FeOH3', 'FeOH2'] },
    'Fe|NO3': { cards: ['FeNO33', 'FeNO32'] },
    'Fe|SO4': { cards: ['FeSO4', 'Fe2SO43'] },
    'Fe|CO3': { cards: ['FeCO3'] },
    /* --- Al(+3) --- */
    'Al|O': { cards: ['Al2O3'] },
    'Al|Cl': { cards: ['AlCl3'] },
    'Al|N': { cards: ['AlN'] },
    'Al|OH': { cards: ['AlOH3'] },
    'Al|NO3': { cards: ['AlNO33'] },
    'Al|SO4': { cards: ['Al2SO43'] },
    'Al|CO3': { reason: '碳酸铝 Al₂(CO₃)₃ 在水溶液中会发生相互促进的水解，生成 Al(OH)₃ 沉淀和 CO₂ 气体，不能稳定存在——所以实验室里买不到碳酸铝。' },
    /* --- C(+2、+4) --- */
    'C|O': { cards: ['CO', 'CO2'] },
    'C|Cl': { cards: ['CCl4'] },
    'C|N': { reason: '碳与氮虽能形成氮化碳等材料，但没有符合初中化合价规则的常见定比化合物，中学阶段不讨论。' },
    'C|OH': { reason: '碳不能与氢氧根直接组成物质：含 OH 的含碳化合物是碳酸 H₂CO₃（试试 H + CO₃）；而 C(OH)₄ 会立即脱水，不能稳定存在。' },
    'C|NO3': { reason: '硝酸根本身就含有氮和氧，碳不能以简单正价离子的形式与硝酸根成盐，不存在"硝酸碳"。' },
    'C|SO4': { reason: '硫酸根里已经含有硫和氧，碳不能与之成盐；你想到的也许是二硫化碳 CS₂，那是碳与硫单质的化合物，与硫酸根无关。' },
    'C|CO3': { reason: '碳酸根本身就含有碳原子，碳不能再与碳酸根结合成新物质——不存在"碳酸碳"。' },
    /* --- S(+4、+6) --- */
    'S|O': { cards: ['SO2', 'SO3'], note: '硫有 +4、+6 两种常见化合价，对应 SO₂ 和 SO₃（拓展卡）两张卡。' },
    'S|Cl': { reason: '硫与氯虽能生成 SCl₂ 等物质，但不属于初中讨论范围，且无法用初中化合价规则书写常见物质。' },
    'S|N': { reason: '硫与氮的化合物（如 S₄N₄）属于大学化学内容，初中、高中均不涉及。' },
    'S|OH': { reason: '不存在"氢氧化硫"：硫的含氧酸（H₂SO₃、H₂SO₄）需要氧元素参与，试试 S + O 或 H + SO₄。' },
    'S|NO3': { reason: '硫不能作为简单阳离子与硝酸根结合成盐，不存在"硝酸硫"。' },
    'S|SO4': { reason: '硫酸根里已经含有硫原子，硫不能再与自己的酸根成盐——同一种元素不能自己和自己组成化合物。' },
    'S|CO3': { reason: '碳酸根与硫不能结合成物质；你想到的也许是 CS₂（二硫化碳），那是硫与碳单质直接化合的产物，与碳酸根无关。' }
  };

  /* 组合档位：含 A 卡 → 'A'；全为 B 卡 → 'B'；无卡 → 'C' */
  function comboTier(entry) {
    if (!entry || entry.reason) return 'C';
    return entry.cards.some(id => CARD_BY_ID[id].tier === 'A') ? 'A' : 'B';
  }

  /* 数据自检：84 格必须全部建档 */
  POS_IDS.forEach(p => NEG_IDS.forEach(n => {
    const key = p + '|' + n;
    if (!COMBO_DB[key] && typeof console !== 'undefined') {
      console.warn('[Zone3] 组合未建档：' + key);
    }
  }));

  /* ---------------- 推导步骤生成 ---------------- */
  function deriveSteps(card) {
    if (card.steps) return card.steps;
    const psym = card.p[0], pval = card.p[1], nsym = card.n[0], nval = card.n[1];
    const g = gcd(pval, nval);
    const psub = nval / g, nsub = pval / g;
    const crossed = side(psym, nval) + side(nsym, pval);
    const formula = side(psym, psub) + side(nsym, nsub);
    let step3;
    if (g > 1) step3 = '约简：下标同除以 ' + g + ' → ' + App.sub(formula);
    else if (psub === 1 && nsub === 1) step3 = '约简：右下角的 1 省略不写 → ' + App.sub(formula);
    else step3 = '约简：下标已互质，无需再约 → ' + App.sub(formula);
    return [
      '标价：' + App.sub(psym) + ' 显 +' + pval + ' 价，' + App.sub(nsym) + ' 显 −' + nval + ' 价',
      '交叉：把价数交叉写到对方符号的右下角 → ' + App.sub(crossed) +
        (GROUPS[nsym] && pval / g > 1 ? '（原子团个数超过 1 时要加括号）' : ''),
      step3,
      '检验：(+' + pval + ')×' + psub + ' + (−' + nval + ')×' + nsub + ' = 0 ✓ 正负化合价代数和为零'
    ];
  }

  /* ---------------- 通用：翻转卡 ---------------- */
  function flipCard(frontHTML, backHTML, extraCls) {
    const c = App.el(
      '<div class="z3-flip ' + (extraCls || '') + '" tabindex="0" role="button" aria-label="点击翻面">' +
        '<div class="z3-flip-inner">' +
          '<div class="z3-face z3-front">' + frontHTML + '</div>' +
          '<div class="z3-face z3-back">' + backHTML + '</div>' +
        '</div>' +
      '</div>'
    );
    const flip = () => c.classList.toggle('flipped');
    c.addEventListener('click', flip);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    return c;
  }

  /* ---------------- Panel A ---------------- */
  function buildPanelA() {
    const panel = App.el(
      '<div class="panel z3-pa">' +
        '<div class="panel-title">PANEL A · 化合价速记（点击卡片翻面）</div>' +
        '<div class="z3-flip-grid"></div>' +
        '<div class="z3-note">💡 别忘了两条铁律：<b>单质中元素的化合价为 0</b>；化合物中各元素正、负化合价的<b>代数和为零</b>。</div>' +
      '</div>'
    );
    const grid = panel.querySelector('.z3-flip-grid');
    MNEMONIC_CARDS.forEach(m => {
      const front =
        '<div class="z3-card-tag">' + m.tag + '</div>' +
        '<div class="z3-card-slogan">' + m.front + '</div>' +
        '<div class="z3-card-hint">点击翻面 →</div>';
      const back =
        '<div class="z3-card-tag">常见化合价</div>' +
        '<table class="z3-val-table"><tbody>' +
        m.back.map(r => '<tr><td>' + App.sub(r[0]) + '</td><td>' + r[1] + '</td></tr>').join('') +
        '</tbody></table>';
      grid.appendChild(flipCard(front, back));
    });
    return panel;
  }

  /* ---------------- Panel B ---------------- */
  function buildPanelB() {
    const panel = App.el(
      '<div class="panel z3-pb">' +
        '<div class="panel-title">PANEL B · 中英文命名对照（初步了解，点击翻面）</div>' +
        '<div class="z3-flip-grid z3-flip-grid-sm"></div>' +
        '<div class="console-card accent z3-naming-note">' +
          '<div class="card-label">命名规律要点</div>' +
          '<ul class="z3-note-list">' +
            '<li>中文习惯<b>从后往前读</b>："某化某"——氯化钠 = 氯 + 化 + 钠。</li>' +
            '<li>英文先说<b>正价元素</b>，再说负价词根：-ide（某化）、-ate（某酸根）。</li>' +
            '<li>两种语言都把<b>正价部分写在化学式前面</b>，顺序不谋而合。</li>' +
            '<li>英文命名在初中仅作初步了解，能认出常见词根即可。</li>' +
          '</ul>' +
        '</div>' +
      '</div>'
    );
    const grid = panel.querySelector('.z3-flip-grid');
    NAME_CARDS.forEach(n => {
      const front =
        '<div class="z3-card-tag">中文命名</div>' +
        '<div class="z3-card-slogan">' + n.cn + '</div>' +
        '<div class="z3-card-formula">' + App.sub(n.formula) + '</div>' +
        '<div class="z3-card-hint">点击翻面 →</div>';
      const back =
        '<div class="z3-card-tag">英文命名</div>' +
        '<div class="z3-card-en">' + n.en + '</div>' +
        '<div class="z3-card-root">' + n.root + '</div>';
      grid.appendChild(flipCard(front, back, 'z3-flip-b'));
    });
    return panel;
  }

  /* ---------------- Panel C：元素拼配台 ---------------- */
  function buildPanelC() {
    const collected = new Set();
    const totalB = CARDS.filter(c => c.tier === 'B').length;
    let slot1 = null, slot2 = null; // {sym, role, val}

    const wrap = App.el(
      '<div class="layout-2col">' +
        '<div class="panel z3-pc">' +
          '<div class="panel-title">PANEL C · 元素拼配台（点微粒 → 点组合）</div>' +
          '<div class="z3-slots">' +
            '<div class="z3-slot z3-slot-pos" data-tip="第 1 槽 · 正价">' +
              '<div class="z3-slot-label">第 1 槽 · 正价</div><div class="z3-slot-body">点下方微粒填入</div>' +
            '</div>' +
            '<div class="z3-slot-plus">＋</div>' +
            '<div class="z3-slot z3-slot-neg" data-tip="第 2 槽 · 负价">' +
              '<div class="z3-slot-label">第 2 槽 · 负价</div><div class="z3-slot-body">点下方微粒填入</div>' +
            '</div>' +
            '<button class="btn btn-primary z3-combine" disabled>⚗️ 组合</button>' +
          '</div>' +
          '<div class="z3-msg"></div>' +
          '<div class="z3-chips-label">微粒仓库（青色 = 正价，品红 = 负价）</div>' +
          '<div class="z3-chips"></div>' +
          '<div class="z3-result"></div>' +
        '</div>' +
        '<div class="console">' +
          '<div class="console-card accent">' +
            '<div class="card-label">物质图鉴 · 收集进度</div>' +
            '<div class="z3-progress"><div class="z3-progress-bar"></div></div>' +
            '<div class="z3-progress-text card-value small">0 / ' + CARDS.length + '</div>' +
            '<div class="z3-progress-sub">含 <b>' + totalB + '</b> 张拓展卡（琥珀色 · 高中及以后）</div>' +
            '<div class="z3-easter"></div>' +
          '</div>' +
          '<div class="console-card">' +
            '<div class="card-label">图鉴（未收集的显示 ?，琥珀框 = 拓展卡）</div>' +
            '<div class="z3-gallery"></div>' +
          '</div>' +
          '<div class="console-card accent-m">' +
            '<div class="card-label">拼配小贴士</div>' +
            '<div class="z3-tip-text">正价微粒进第 1 槽、负价微粒进第 2 槽；点槽位可清空。' +
            '不少组合藏着"姊妹卡"——比如 H 和 O 不只有水，Fe 的组合常有 +2、+3 两兄弟。' +
            '琥珀色卡是拓展内容（高中及以后），也计入图鉴；无效组合会抖一抖并告诉你具体原因。</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    const slotEls = [wrap.querySelector('.z3-slot-pos'), wrap.querySelector('.z3-slot-neg')];
    const combineBtn = wrap.querySelector('.z3-combine');
    const msgEl = wrap.querySelector('.z3-msg');
    const chipsEl = wrap.querySelector('.z3-chips');
    const resultEl = wrap.querySelector('.z3-result');
    const galleryEl = wrap.querySelector('.z3-gallery');
    const barEl = wrap.querySelector('.z3-progress-bar');
    const textEl = wrap.querySelector('.z3-progress-text');
    const easterEl = wrap.querySelector('.z3-easter');

    /* 图鉴网格 */
    CARDS.forEach(c => {
      const g = App.el('<div class="z3-gitem' + (c.tier === 'B' ? ' tier-b' : '') + '" data-id="' + c.id + '" title="">' +
        '<div class="z3-gformula">?</div><div class="z3-gname">???</div></div>');
      galleryEl.appendChild(g);
    });

    function renderGallery() {
      galleryEl.querySelectorAll('.z3-gitem').forEach(g => {
        const c = CARD_BY_ID[g.dataset.id];
        if (collected.has(c.id)) {
          g.classList.add('got');
          g.querySelector('.z3-gformula').textContent = c.emoji + ' ' + App.sub(c.formula);
          g.querySelector('.z3-gname').textContent = c.name;
          g.title = c.name + ' · ' + App.sub(c.formula) + (c.tier === 'B' ? '（拓展 · 高中及以后）' : '');
        }
      });
      barEl.style.width = (collected.size / CARDS.length * 100) + '%';
      textEl.textContent = collected.size + ' / ' + CARDS.length;
      if (collected.size === CARDS.length) {
        easterEl.innerHTML = '🎉 图鉴全部点亮（含全部拓展卡）！你已解锁<b>「元素炼金术士」</b>称号——"代数和为零"这位裁判亲自为你鼓掌！';
        easterEl.classList.add('show');
      }
    }

    /* 槽位渲染 */
    function renderSlots() {
      const vals = [slot1, slot2];
      slotEls.forEach((el, i) => {
        const body = el.querySelector('.z3-slot-body');
        if (vals[i]) {
          el.classList.add('filled');
          body.innerHTML = '<span class="z3-slot-sym">' + App.sub(vals[i].sym) + '</span>' +
            '<span class="z3-slot-val">' + vals[i].val + '</span>';
        } else {
          el.classList.remove('filled');
          body.textContent = '点下方微粒填入';
        }
      });
      combineBtn.disabled = !(slot1 && slot2);
    }

    slotEls.forEach((el, i) => {
      el.addEventListener('click', () => {
        if (i === 0) slot1 = null; else slot2 = null;
        msgEl.textContent = '';
        renderSlots();
      });
    });

    /* 微粒圆片 */
    PARTICLES.forEach(p => {
      const chip = App.el(
        '<button class="z3-chip ' + (p.role === 'p' ? 'z3-chip-pos' : 'z3-chip-neg') + '">' +
          '<span class="z3-chip-sym">' + App.sub(p.sym) + '</span>' +
          '<span class="z3-chip-val">' + p.val + '</span>' +
        '</button>'
      );
      chip.addEventListener('click', () => {
        if (p.role === 'p') slot1 = p; else slot2 = p;
        msgEl.textContent = '';
        renderSlots();
      });
      chipsEl.appendChild(chip);
    });

    /* 抖动 */
    function shake() {
      slotEls.forEach(el => {
        el.classList.remove('z3-shake');
        void el.offsetWidth;
        el.classList.add('z3-shake');
      });
    }

    /* 物质卡渲染（B 档卡带琥珀色"拓展"标签） */
    function substanceCard(c) {
      const got = collected.has(c.id);
      const tierTag = c.tier === 'B' ? '<span class="z3-sub-tier">拓展 · 高中及以后</span>' : '';
      const card = App.el(
        '<div class="z3-sub-card' + (c.tier === 'B' ? ' z3-sub-card-b' : '') + '">' +
          '<div class="z3-sub-head">' +
            '<div class="z3-sub-emoji">' + c.emoji + '</div>' +
            '<div>' +
              '<div class="z3-sub-formula">' + App.sub(c.formula) + '</div>' +
              '<div class="z3-sub-name">' + c.name + tierTag + '</div>' +
            '</div>' +
            '<button class="btn ' + (got ? '' : 'btn-primary') + ' z3-collect" ' + (got ? 'disabled' : '') + '>' +
              (got ? '✓ 已收入图鉴' : '📥 收入图鉴') +
            '</button>' +
          '</div>' +
          '<div class="z3-sub-use">' + c.use + '</div>' +
          '<div class="z3-derive">' +
            '<div class="card-label">推导过程（标价 → 交叉 → 约简 → 检验）' + (c.tier === 'B' ? ' · 拓展了解' : '') + '</div>' +
            '<ol class="z3-derive-list">' +
            deriveSteps(c).map(s => '<li>' + s + '</li>').join('') +
            '</ol>' +
          '</div>' +
        '</div>'
      );
      const btn = card.querySelector('.z3-collect');
      if (!got) {
        btn.addEventListener('click', () => {
          collected.add(c.id);
          btn.disabled = true;
          btn.classList.remove('btn-primary');
          btn.textContent = '✓ 已收入图鉴';
          renderGallery();
        });
      }
      return card;
    }

    /* 组合：数据驱动判定 */
    combineBtn.addEventListener('click', () => {
      const key = slot1.sym + '|' + slot2.sym;
      const entry = COMBO_DB[key];
      resultEl.innerHTML = '';
      if (!entry || entry.reason) {
        shake();
        msgEl.innerHTML = '❌ ' + (entry ? entry.reason : '这两种微粒在初中阶段不能组成常见物质，换个组合试试。');
        return;
      }
      const tier = comboTier(entry);
      let msg = '✅ 组合成功！';
      if (entry.cards.length > 1) msg += '这个组合有 ' + entry.cards.length + ' 张卡，别漏收～';
      if (tier === 'B') msg += '（琥珀色 = 拓展卡，真实存在但超出初中，高中再深学）';
      else if (entry.cards.some(id => CARD_BY_ID[id].tier === 'B')) msg += '（其中琥珀色卡为拓展内容）';
      if (entry.note) msg += '<br>💡 ' + entry.note;
      msgEl.innerHTML = msg;
      entry.cards.forEach(id => resultEl.appendChild(substanceCard(CARD_BY_ID[id])));
    });

    renderSlots();
    renderGallery();
    return wrap;
  }

  /* ---------------- 调试接口：供外部自动化测试 ---------------- */
  function _testCombine(posId, negId) {
    const key = posId + '|' + negId;
    const entry = COMBO_DB[key];
    if (!entry) return { key: key, tier: 'C', reason: '(组合未建档)' };
    if (entry.reason) return { key: key, tier: 'C', reason: entry.reason };
    return {
      key: key,
      tier: comboTier(entry),
      note: entry.note || null,
      cards: entry.cards.map(id => {
        const c = CARD_BY_ID[id];
        return {
          id: c.id, formula: c.formula, name: c.name, tier: c.tier,
          derived: (c.p && c.n) ? deriveFormula(c.p, c.n) : null
        };
      })
    };
  }

  /* ---------------- 导出模块 ---------------- */
  window.Zone3 = {
    desc: '化合物里元素有<b>化合价</b>，且化合物中各元素正、负化合价的<b>代数和为零</b>——这是书写化学式的根本依据。' +
      '写化学式：<b>正价在前、负价在后</b>，标价交叉、约简定个数。' +
      '在<span class="hl">元素拼配台</span>上亲手把微粒"算"成物质，点亮你的 <span class="hl">' + CARDS.length + ' 张物质图鉴</span>（含拓展卡）！',

    init(container) {
      container.appendChild(buildPanelA());
      container.appendChild(buildPanelB());
      container.appendChild(buildPanelC());
      container.appendChild(App.el(
        '<div class="takeaway">化学式不是背出来的，是用化合价<b>"算"出来的</b>——' +
        '化合物中各元素正、负化合价的<b>代数和为零</b>，这是唯一的裁判。⚖️</div>'
      ));
    },

    _testCombine: _testCombine,
    _stats: {
      combos: {
        A: POS_IDS.reduce((s, p) => s + NEG_IDS.filter(n => comboTier(COMBO_DB[p + '|' + n]) === 'A').length, 0),
        B: POS_IDS.reduce((s, p) => s + NEG_IDS.filter(n => comboTier(COMBO_DB[p + '|' + n]) === 'B').length, 0),
        C: POS_IDS.reduce((s, p) => s + NEG_IDS.filter(n => comboTier(COMBO_DB[p + '|' + n]) === 'C').length, 0)
      },
      cards: { total: CARDS.length, A: CARDS.filter(c => c.tier === 'A').length, B: CARDS.filter(c => c.tier === 'B').length }
    }
  };
})();
