// ================================================================
// card-data.js — 卡片数据（13张完整 + 4个碎片组 = 17张）
// 新增 category 字段用于样式区分
// ================================================================

const CARD_DATA = [
    // ===== 力学类（青色）=====
    {
        id: 'speed',
        name: '速度心法',
        type: 'full',
        category: 'mechanics',
        formula: 'v = \\dfrac{s}{t}',
        variables: [
            { symbol: 'v', meaning: '速度', units: 'm/s【米每秒】、km/h【千米每小时】' },
            { symbol: 's', meaning: '路程', units: 'm【米】、km【千米】' },
            { symbol: 't', meaning: '时间', units: 's【秒】、h【小时】' }
        ],
        variants: [
            { label: '求路程', latex: 's = vt' },
            { label: '求时间', latex: 't = \\dfrac{s}{v}' }
        ],
        questions: [
            { q: '汽车在平直公路上行驶，2小时内通过的路程为72 km。它的速度是（ ）', opts: ['36 m/s', '10 m/s', '20 m/s', '72 km/h'], ans: 1 },
            { q: '某物体以15 m/s的速度匀速移动，移动时间为0.5小时。它通过的路程是（ ）', opts: ['7.5 m', '7.5 km', '27 m', '27 km'], ans: 3 },
            { q: '小香跑步的速度为5 m/s，跑完1000 m需要的时间是（ ）', opts: ['200 s', '50 s', '5000 s', '20 s'], ans: 0 }
        ]
    },
    {
        id: 'density',
        name: '密度心法',
        type: 'full',
        category: 'mechanics',
        formula: '\\rho = \\dfrac{m}{V}',
        variables: [
            { symbol: '\\rho', meaning: '密度', units: 'g/cm³【克每立方厘米】、kg/m³【千克每立方米】' },
            { symbol: 'm', meaning: '质量', units: 'g【克】、kg【千克】' },
            { symbol: 'V', meaning: '体积', units: 'cm³【立方厘米】、m³【立方米】' }
        ],
        variants: [
            { label: '求质量', latex: 'm = \\rho V' },
            { label: '求体积', latex: 'V = \\dfrac{m}{\\rho}' }
        ],
        questions: [
            { q: '一块金属的质量为89 kg，体积为0.01 m³，它的密度是（ ）', opts: ['8.9×10³ kg/m³', '0.89×10³ kg/m³', '89×10³ kg/m³', '8.9 g/cm³'], ans: 0 },
            { q: '已知某液体的密度为0.8×10³ kg/m³，体积为2 m³，该液体的质量为（ ）', opts: ['1.6 kg', '0.4×10³ kg', '1.6×10³ kg', '1600 g'], ans: 2 },
            { q: '一块铁块质量为158 g，铁的密度为7.9×10³ kg/m³，则铁块的体积为（ ）', opts: ['20 m³', '200 cm³', '0.02 m³', '20 cm³'], ans: 3 }
        ]
    },
    {
        id: 'gravity',
        name: '重力心法',
        type: 'full',
        category: 'mechanics',
        formula: 'G = mg',
        variables: [
            { symbol: 'G', meaning: '重力', units: 'N【牛】' },
            { symbol: 'm', meaning: '质量', units: 'kg【千克】' },
            { symbol: 'g', meaning: '比值（通常取10）', units: 'N/kg【牛每千克】' }
        ],
        variants: [
            { label: '求质量', latex: 'm = \\dfrac{G}{g}' }
        ],
        questions: [
            { q: '一个物体的质量为2 kg，在地球表面受到的重力为（g取10 N/kg）（ ）[g取10 N/kg]', opts: ['0.2 N', '20 N', '200 N', '5 N'], ans: 1 },
            { q: '某物体在地球上受到的重力为30 N，则该物体的质量为（ ）[g取10 N/kg]', opts: ['300 kg', '3 kg', '30 kg', '0.33 kg'], ans: 1 }
        ]
    },
    {
        id: 'pressure',
        name: '压强心法',
        type: 'full',
        category: 'mechanics',
        formula: 'p = \\dfrac{F}{S}',
        variables: [
            { symbol: 'p', meaning: '压强', units: 'Pa【帕】、N/m²【牛每平方米】' },
            { symbol: 'F', meaning: '压力', units: 'N【牛】' },
            { symbol: 'S', meaning: '受力面积', units: 'm²【平方米】' }
        ],
        variants: [
            { label: '求压力', latex: 'F = pS' },
            { label: '求受力面积', latex: 'S = \\dfrac{F}{p}' }
        ],
        questions: [
            { q: '一个重为60 N的正方体木块放在水平桌面上，木块与桌面的接触面积为0.03 m²，木块对桌面的压强为（ ）', opts: ['200 Pa', '1800 Pa', '2000 Pa', '2×10⁴ Pa'], ans: 2 },
            { q: '某物体对水平面的压强为5000 Pa，受力面积为0.02 m²，则压力为（ ）', opts: ['100 N', '2500 N', '1000 N', '10 N'], ans: 0 },
            { q: '一个物体对水平面的压力为200 N，产生的压强为4000 Pa，则受力面积为（ ）', opts: ['20 m²', '0.5 m²', '0.2 m²', '0.05 m²'], ans: 3 }
        ]
    },
    {
        id: 'liquid_pressure',
        name: '液体压强心法',
        type: 'full',
        category: 'mechanics',
        formula: 'p = ρ_{液} gh',
        variables: [
            { symbol: 'p', meaning: '液体压强', units: 'Pa【帕】' },
            { symbol: 'ρ_{液}', meaning: '液体密度', units: 'kg/m³【千克每立方米】' },
            { symbol: 'g', meaning: '比值（取10）', units: 'N/kg【牛每千克】' },
            { symbol: 'h', meaning: '深度', units: 'm【米】' }
        ],
        variants: [],
        questions: [
            { q: '水深10 m处，水的压强约为（ ）[水的密度为1.0×10³ kg/m³，g=10 N/kg]', opts: ['1×10⁵ Pa', '1×10⁴ Pa', '1×10³ Pa', '1×10⁶ Pa'], ans: 0 }
        ]
    },
    {
        id: 'work',
        name: '功心法',
        type: 'full',
        category: 'mechanics',
        formula: 'W = Fs',
        variables: [
            { symbol: 'W', meaning: '功', units: 'J【焦】' },
            { symbol: 'F', meaning: '力', units: 'N【牛】' },
            { symbol: 's', meaning: '距离', units: 'm【米】' }
        ],
        variants: [
            { label: '求力', latex: 'F = \\dfrac{W}{s}' },
            { label: '求距离', latex: 's = \\dfrac{W}{F}' }
        ],
        questions: [
            { q: '一个物体在水平方向上受到50 N的拉力，沿力的方向移动了4 m，拉力做的功为（ ）', opts: ['200 J', '12.5 J', '50 J', '200 W'], ans: 0 },
            { q: '某力做功600 J，使物体沿力的方向移动了3 m，则该力的大小为（ ）', opts: ['20 N', '1800 N', '200 N', '600 N'], ans: 2 },
            { q: '用100 N的力推箱子，做了500 J的功，则箱子在力的方向上移动的距离为（ ）', opts: ['500 m', '0.2 m', '50 m', '5 m'], ans: 3 }
        ]
    },
    {
        id: 'power_mech',
        name: '功率心法',
        type: 'full',
        category: 'mechanics',
        formula: 'P = \\dfrac{W}{t}',
        variables: [
            { symbol: 'P', meaning: '功率', units: 'W【瓦】' },
            { symbol: 'W', meaning: '功', units: 'J【焦】' },
            { symbol: 't', meaning: '时间', units: 's【秒】' }
        ],
        variants: [
            { label: '求功', latex: 'W = Pt' },
            { label: '求时间', latex: 't = \\dfrac{W}{P}' },
            { label: '求功率（用速度）', latex: 'P = Fv' }
        ],
        questions: [
            { q: '一台机器在10 s内做了2000 J的功，它的功率是（ ）', opts: ['20 W', '200 W', '2000 W', '2×10⁴ W'], ans: 1 },
            { q: '某机械设备的功率为500 W，工作2 min，它做功为（ ）', opts: ['6×10⁴ J', '1000 J', '1×10⁴ J', '6×10⁵ J'], ans: 0 },
            { q: '一个功率为40 W的简单机械，做功240 J，需要工作（ ）', opts: ['60 s', '0.167 s', '600 s', '6 s'], ans: 3 },
            { q: '一辆汽车以20 m/s的速度匀速行驶，牵引力为1500 N，则牵引力的功率为（ ）', opts: ['300 W', '3×10⁴ W', '7.5×10⁴ W', '3 kW'], ans: 1 }
        ]
    },
    {
        id: 'lever',
        name: '杠杆心法',
        type: 'full',
        category: 'mechanics',
        formula: 'F_1 l_1 = F_2 l_2',
        variables: [
            { symbol: 'F_1', meaning: '动力', units: 'N【牛】' },
            { symbol: 'l_1', meaning: '动力臂', units: 'm【米】' },
            { symbol: 'F_2', meaning: '阻力', units: 'N【牛】' },
            { symbol: 'l_2', meaning: '阻力臂', units: 'm【米】' }
        ],
        variants: [],
        questions: [
            { q: '一根杠杆平衡时，动力臂为0.3 m，阻力为60 N，阻力臂为0.1 m，则动力F₁为（ ）', opts: ['2 N', '180 N', '6 N', '20 N'], ans: 3 }
        ]
    },
    {
        id: 'efficiency_mech',
        name: '机械效率心法',
        type: 'full',
        category: 'mechanics',
        formula: '\\eta = \\dfrac{W_{有}}{W_{总}}',
        variables: [
            { symbol: '\\eta', meaning: '机械效率（百分数）', units: '无' },
            { symbol: 'W_{有}', meaning: '有用功', units: 'J【焦】' },
            { symbol: 'W_{总}', meaning: '总功', units: 'J【焦】' }
        ],
        variants: [
            { label: '有用功', latex: 'W_{有} = G_{物}h' },
            { label: '总功', latex: 'W_{总} = F_{拉}s' }
        ],
        questions: [
            { q: '用滑轮组提升重物，物体重力为80N，上升的高度为5m，绳端的拉力为50N，绳子自由端移动的距离为10m，则机械效率为（ ）', opts: ['20%', '125%', '80%', '0.08'], ans: 2 }
        ]
    },

    // ===== 热学类（赤色）=====
    {
        id: 'specific_heat',
        name: '比热容心法',
        type: 'full',
        category: 'thermal',
        formula: 'Q = cm\\Delta t',
        variables: [
            { symbol: 'Q', meaning: '热量', units: 'J【焦】' },
            { symbol: 'c', meaning: '比热容', units: 'J/(kg·℃)【焦每千克摄氏度】' },
            { symbol: 'm', meaning: '质量', units: 'kg【千克】' },
            { symbol: '\\Delta t', meaning: '温度变化量', units: '℃【摄氏度】' }
        ],
        variants: [
            { label: '求比热容', latex: 'c = \\dfrac{Q}{m\\Delta t}' },
            { label: '求质量', latex: 'm = \\dfrac{Q}{c\\Delta t}' },
            { label: '求温度的变化量', latex: '\\Delta t = \\dfrac{Q}{m c}' }
        ],
        questions: [
            { q: '质量为0.5 kg的水，温度从80℃降到30℃，放出的热量为（ ）[水的比热容为4.2×10³ J/(kg·℃)]', opts: ['1.05×10⁴ J', '1.05×10⁵ J', '2.1×10⁵ J', '6.3×10⁴ J'], ans: 1 },
            { q: '质量为2 kg的某种液体，温度升高了20 ℃，吸收了1.68×10⁵ J的热量，该液体的比热容为（ ）', opts: ['0.84×10³ J/(kg·℃)', '2.1×10³ J/(kg·℃)', '8.4×10³ J/(kg·℃)', '4.2×10³ J/(kg·℃)'], ans: 3 },
            { q: '质量为1 kg的水，初温为30℃，吸收了2.1×10⁵J的热量，则水的末温为（ ）[水的比热容为4.2×10³ J/(kg·℃)]', opts: ['40 ℃', '60 ℃', '80 ℃', '100 ℃'], ans: 2 },
            { q: '一壶水温度升高了20 ℃，吸收了4.2×10⁵ J的热量，该这壶水的质量为（ ）[水的比热容为4.2×10³ J/(kg·℃)]', opts: ['4 kg', '5 kg', '6 kg', '7 kg'], ans: 1 }
        ]
    },

    // ===== 电学类（紫色）=====
    {
        id: 'ohm',
        name: '欧姆心法',
        type: 'full',
        category: 'electric',
        formula: 'I = \\dfrac{U}{R}',
        variables: [
            { symbol: 'I', meaning: '电流', units: 'A【安】' },
            { symbol: 'U', meaning: '电压', units: 'V【伏】' },
            { symbol: 'R', meaning: '电阻', units: 'Ω【欧】' }
        ],
        variants: [
            { label: '求电压', latex: 'U = IR' },
            { label: '求电阻', latex: 'R = \\dfrac{U}{I}' }
        ],
        questions: [
            { q: '一个电阻为10 Ω的导体，通过它的电流为0.5 A，则导体两端的电压为（ ）', opts: ['20 V', '5 V', '0.05 V', '2 V'], ans: 1 },
            { q: '某电阻两端电压为12 V，电阻为30 Ω，则通过它的电流为（ ）', opts: ['360 A', '2.5 A', '0.4 A', '0.04 A'], ans: 2 },
            { q: '一个用电器两端电压为220 V，通过它的电流为0.2 A，则用电器的电阻为（ ）', opts: ['2200 Ω', '44 Ω', '110 Ω', '1100 Ω'], ans: 3 }
        ]
    },
    {
        id: 'elec_work',
        name: '电功心法',
        type: 'full',
        category: 'electric',
        formula: 'W = UIt',
        variables: [
            { symbol: 'W', meaning: '电功', units: 'J【焦】' },
            { symbol: 'U', meaning: '电压', units: 'V【伏】' },
            { symbol: 'I', meaning: '电流', units: 'A【安】' },
            { symbol: 't', meaning: '时间', units: 's【秒】' }
        ],
        variants: [],
        questions: [
            { q: '一个用电器两端的电压为12 V，通过的电流为2 A，工作10 s，电流做的功为（ ）', opts: ['240 J', '24 J', '120 J', '20 J'], ans: 0 }
        ]
    },
    {
        id: 'elec_heat',
        name: '电热心法',
        type: 'full',
        category: 'electric',
        formula: 'Q = I^2Rt',
        variables: [
            { symbol: 'Q', meaning: '电热', units: 'J【焦】' },
            { symbol: 'I', meaning: '电流', units: 'A【安】' },
            { symbol: 'R', meaning: '电阻', units: 'Ω【欧】' },
            { symbol: 't', meaning: '时间', units: 's【秒】' }
        ],
        variants: [],
        questions: [
            { q: '一个电阻为10 Ω的导体，通过0.5 A的电流，通电100 s，产生的热量为（ ）', opts: ['25 J', '250 J', '500 J', '50 J'], ans: 1 }
        ]
    },

    // ===== 碎片组（4组）=====
    // 浮力（水系秘术，蓝色）
    {
        id: 'buoyancy',
        name: '浮力心法',
        type: 'group',
        category: 'buoyancy',
        fragments: [
            {
                id: 'buoyancy_pressure',
                name: '压力差法',
                formula: 'F_{浮} = F_{向上} - F_{向下}',
                variables: [
                    { symbol: 'F_{浮}', meaning: '浮力', units: 'N【牛】' },
                    { symbol: 'F_{向上}', meaning: '下表面受到向上的压力', units: 'N【牛】' },
                    { symbol: 'F_{向下}', meaning: '上表面受到向下的压力', units: 'N【牛】' }
                ],
                variants: [],
                questions: [
                    { q: '一个物体浸没在水中，下表面受到向上的压力为20 N，上表面受到向下的压力为8 N，则物体受到的浮力为（ ）', opts: ['28 N', '12 N', '20 N', '8 N'], ans: 1 }
                ]
            },
            {
                id: 'buoyancy_weigh',
                name: '称重法',
                formula: 'F_{浮} = G - F_{拉}',
                variables: [
                    { symbol: 'F_{浮}', meaning: '浮力', units: 'N【牛】' },
                    { symbol: 'G', meaning: '物体的重力', units: 'N【牛】' },
                    { symbol: 'F_{拉}', meaning: '浸在水中时弹簧测力计的拉力', units: 'N【牛】' }
                ],
                variants: [],
                questions: [
                    { q: '一个物体在空气中用弹簧测力计称得重为5 N，浸没在水中时弹簧测力计示数为3 N，则物体受到的浮力为（ ）', opts: ['3 N', '8 N', '5 N', '2 N'], ans: 3 }
                ]
            },
            {
                id: 'buoyancy_arch',
                name: '阿基米德原理法',
                formula: 'F_{浮} = \\rho_{液}gV_{排}',
                variables: [
                    { symbol: 'F_{浮}', meaning: '浮力', units: 'N【牛】' },
                    { symbol: '\\rho_{液}', meaning: '液体密度', units: 'kg/m³【千克每立方米】' },
                    { symbol: 'g', meaning: '比值（取10）', units: 'N/kg【牛每千克】' },
                    { symbol: 'V_{排}', meaning: '物体排开液体的体积', units: 'm³【立方米】' }
                ],
                variants: [
                    { label: '求液体密度', latex: '\\rho_{液} = \\dfrac{F_{浮}}{gV_{排}}' },
                    { label: '求排开液体体积', latex: 'V_{排} = \\dfrac{F_{浮}}{g\\rho_{液}}' }
                ],
                questions: [
                    { q: '一个物体排开水的体积为0.002 m³，水的密度为1.0×10³ kg/m³，g取10 N/kg，则浮力为（ ）', opts: ['2 N', '20 N', '0.2 N', '200 N'], ans: 1 },
                    { q: '某物体浸没在某种液体中，受到的浮力为12 N，排开液体的体积为1.5×10⁻³ m³，g=10 N/kg，则该液体的密度为（ ）', opts: ['0.8×10³ kg/m³', '1.8×10³ kg/m³', '0.8 kg/m³', '8×10³ kg/m³'], ans: 0 },
                    { q: '一个物体在水中受到的浮力为15 N，水的密度为1.0×10³ kg/m³，g=10 N/kg，则排开水的体积为（ ）', opts: ['1.5×10⁻² m³', '1.5 m³', '0.15 m³', '1.5×10⁻³ m³'], ans: 3 }
                ]
            },
            {
                id: 'buoyancy_balance',
                name: '平衡法',
                formula: 'F_{浮} = G_{物}',
                variables: [
                    { symbol: 'F_{浮}', meaning: '浮力', units: 'N【牛】' },
                    { symbol: 'G_{物}', meaning: '物体的重力', units: 'N【牛】' }
                ],
                variants: [],
                questions: [
                    { q: '一个木块漂浮在水面上，已知木块的重力为8 N，则木块受到的浮力为（ ）', opts: ['0 N', '8 N', '大于8 N', '小于8 N'], ans: 1 }
                ]
            }
        ]
    },
    // 热值（火系功法，赤色）
    {
        id: 'heatval',
        name: '热值心法',
        type: 'group',
        category: 'thermal',
        fragments: [
            {
                id: 'heatval_mass',
                name: '质量公式（固体/液体）',
                formula: 'Q = mq',
                variables: [
                    { symbol: 'Q', meaning: '燃料燃烧释放的热量', units: 'J【焦】' },
                    { symbol: 'm', meaning: '燃料的质量', units: 'kg【千克】' },
                    { symbol: 'q', meaning: '热值（J/kg）', units: 'J/kg【焦每千克】' }
                ],
                variants: [
                    { label: '求质量', latex: 'm = \\dfrac{Q}{q}' }
                ],
                questions: [
                    { q: '完全燃烧0.2 kg的酒精，放出的热量为（ ）[酒精的热值为3.0×10⁷ J/kg]', opts: ['1.5×10⁸ J', '6.0×10⁶ J', '6.0×10⁷ J', '1.5×10⁷ J'], ans: 1 },
                    { q: '天然气的热值为4.2×10⁷ J/m³，若放出8.4×10⁷ J的热量，需要燃烧天然气（ ）', opts: ['2 m³', '0.5 m³', '2 kg', '0.5 kg'], ans: 0 }
                ]
            },
            {
                id: 'heatval_vol',
                name: '体积公式（气体）',
                formula: 'Q = Vq',
                variables: [
                    { symbol: 'Q', meaning: '燃料燃烧释放的热量', units: 'J【焦】' },
                    { symbol: 'V', meaning: '燃料的体积', units: 'm³【立方米】' },
                    { symbol: 'q', meaning: '热值（J/m³）', units: 'J/m³【焦每立方米】' }
                ],
                variants: [
                    { label: '求体积', latex: 'V = \\dfrac{Q}{q}' }
                ],
                questions: [
                    { q: '完全燃烧0.5 m³的煤气，热值为3.9×10⁷ J/m³，放出的热量为（ ）', opts: ['1.95×10⁷ J', '7.8×10⁷ J', '3.9×10⁷ J', '1.95×10⁶ J'], ans: 0 },
                    { q: '某种气体燃料的热值为2.4×10⁷ J/m³，完全燃烧放出7.2×10⁷ J的热量，需要该气体（ ）', opts: ['0.333 m³', '3 m³', '3 kg', '0.333 kg'], ans: 1 }
                ]
            }
        ]
    },
    // 热效率（火系，赤色）
    {
        id: 'thermaleff',
        name: '热效率心法',
        type: 'group',
        category: 'thermal',
        fragments: [
            {
                id: 'thermaleff_water',
                name: '烧水类',
                formula: '\\eta = \\dfrac{Q_{吸}}{Q_{放}}',
                variables: [
                    { symbol: '\\eta', meaning: '热效率（数值）', units: '无' },
                    { symbol: 'Q_{吸}', meaning: '液体吸收的热量', units: 'J【焦】' },
                    { symbol: 'Q_{放}', meaning: '燃料燃烧释放的热量', units: 'J【焦】' }
                ],
                variants: [],
                questions: [
                    { q: '用氢气作为燃料烧水，水的质量为10kg，升高的温度为10℃，消耗的氢气为0.1kg，则烧水的热效率为（ ）[水的比热容为4.2×10³ J/(kg·℃)，氢气的热值为1.4×10⁷ J/kg]', opts: ['33.3%', '3%', '30%', '60%'], ans: 2 }
                ]
            },
            {
                id: 'thermaleff_car',
                name: '汽车行驶类',
                formula: '\\eta = \\dfrac{W_{有}}{Q_{放}}',
                variables: [
                    { symbol: '\\eta', meaning: '热效率（数值）', units: '无' },
                    { symbol: 'W_{有}', meaning: '有用功', units: 'J【焦】' },
                    { symbol: 'Q_{放}', meaning: '燃料燃烧释放的热量', units: 'J【焦】' }
                ],
                variants: [],
                questions: [
                    { q: '汽车匀速行驶时，发动机的牵引力为920N，行驶了1000m，消耗的汽油为0.05kg，假设汽油完全燃烧，则发动机热效率为（ ）[汽油的热值为4.6×10⁷ J/kg]', opts: ['25%', '4%', '40%', '50%'], ans: 2 }
                ]
            }
        ]
    },
    // 电功率（雷电心法，紫色）
    {
        id: 'elecpower',
        name: '电功率心法',
        type: 'group',
        category: 'electric',
        fragments: [
            {
                id: 'elecpower_def',
                name: '定义式',
                formula: 'P = \\dfrac{W}{t}',
                variables: [
                    { symbol: 'P', meaning: '电功率', units: 'W【瓦】、kW【千瓦】' },
                    { symbol: 'W', meaning: '电功', units: 'J【焦】、kW·h【千瓦时】' },
                    { symbol: 't', meaning: '时间', units: 's【秒】、h【小时】' }
                ],
                variants: [
                    { label: '求电功', latex: 'W = Pt' },
                    { label: '求工作时间', latex: 't = \\dfrac{W}{P}' }
                ],
                questions: [
                    { q: '一个电风扇工作20 s消耗电能480 J，它的电功率为（ ）', opts: ['2.4 W', '24 W', '240 W', '9600 W'], ans: 1 },
                    { q: '一台电热水器功率为1500 W，正常工作10 min，消耗的电能为（ ）', opts: ['1.5×10⁶ J', '1.5×10⁴ J', '2.5×10⁴ J', '9×10⁵ J'], ans: 3 },
                    { q: '一个LED灯泡功率为10 W，消耗电能3.6×10⁴ J，需要工作（ ）', opts: ['36000 s', '360 s', '3600 s', '36 s'], ans: 2 },
                    { q: '某空调连续工作5小时，共消耗电能6 kW·h，则该空调的电功率为（ ）', opts: ['1.2 kW', '0.83 kW', '30 kW', '1.2 W'], ans: 0 },
                    { q: '一台电视机的电功率为0.15 kW，每天正常工作4小时，它每天消耗的电能为（ ）', opts: ['26.67 kW·h', '0.6 J', '0.6 kW·h', '0.6 kW'], ans: 2 },
                    { q: '一个额定功率为2 kW的电热水器，烧水时消耗了0.5 kW·h的电能，则它工作了（ ）', opts: ['1 h', '4 h', '0.25 h', '0.25 min'], ans: 2 }
                ]
            },
            {
                id: 'elecpower_meas',
                name: '测量式',
                formula: 'P = UI',
                variables: [
                    { symbol: 'P', meaning: '电功率', units: 'W【瓦】' },
                    { symbol: 'U', meaning: '电压', units: 'V【伏】' },
                    { symbol: 'I', meaning: '电流', units: 'A【安】' }
                ],
                variants: [
                    { label: '求电流', latex: 'I = \\dfrac{P}{U}' }
                ],
                questions: [
                    { q: '一个电阻两端的电压为6 V，通过的电流为0.3 A，则电阻的电功率为（ ）', opts: ['1.8 W', '18 W', '0.18 W', '20 W'], ans: 0 },
                    { q: '某用电器电功率为110 W，接在220 V的电源上，则通过它的电流为（ ）', opts: ['2 A', '0.5 A', '0.05 A', '5 A'], ans: 1 }
                ]
            },
            {
                id: 'elecpower_series',
                name: '串联导出式',
                formula: 'P = I^2R',
                variables: [
                    { symbol: 'P', meaning: '电功率', units: 'W【瓦】' },
                    { symbol: 'I', meaning: '电流', units: 'A【安】' },
                    { symbol: 'R', meaning: '电阻', units: 'Ω【欧】' }
                ],
                variants: [],
                questions: [
                    { q: '一个电阻为5 Ω的导体，通过它的电流为2 A，则其电功率为（ ）', opts: ['20 W', '10 W', '5 W', '40 W'], ans: 0 }
                ]
            },
            {
                id: 'elecpower_parallel',
                name: '并联导出式',
                formula: 'P = \\dfrac{U^2}{R}',
                variables: [
                    { symbol: 'P', meaning: '电功率', units: 'W【瓦】' },
                    { symbol: 'U', meaning: '电压', units: 'V【伏】' },
                    { symbol: 'R', meaning: '电阻', units: 'Ω【欧】' }
                ],
                variants: [
                    { label: '求电阻', latex: 'R = \\dfrac{U^2}{P}' }
                ],
                questions: [
                    { q: '一个电阻为20 Ω的用电器，接在10 V的电源上，其电功率为（ ）', opts: ['5 W', '200 W', '2 W', '0.5 W'], ans: 0 },
                    { q: '一个电烙铁的电功率为100 W，接在220 V的电源上，则其电阻为（ ）', opts: ['4840 Ω', '2.2 Ω', '484 Ω', '22 Ω'], ans: 2 }
                ]
            }
        ]
    }
];