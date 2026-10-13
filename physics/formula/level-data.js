// ================================================================
// level-data.js — 闯关题目数据
// ================================================================

window.LEVEL_QUESTIONS = [
    //速度心法3个
    { id: 'v_v', text: '运用速度心法求速度', answer: ['v', '=', 's', '÷', 't'], hint: '速度 等于 路程 除以 时间', display: 'v = \\dfrac{s}{t}' },
    { id: 'v_t', text: '运用速度心法求时间', answer: ['t', '=', 's', '÷', 'v'], hint: '时间 等于 路程 除以速度', display: 't = \\dfrac{s}{v}' },
    { id: 'v_s', text: '运用速度心法求路程', answer: ['s', '=', 'v', '×', 't'], hint: '路程 等于 速度 乘以时间', display: 's = v  t' },
    //密度心法3个
    { id: 'rho_m', text: '运用密度心法求质量', answer: ['m', '=', 'ρ', '×', 'V'], hint: '质量 等于 密度 乘以体积', display: 'm = \\rho  V' },
    { id: 'rho_V', text: '运用密度心法求体积', answer: ['V', '=', 'm', '÷', 'ρ'], hint: '体积 等于 质量 除以 密度', display: 'V = \\dfrac{m}{\\rho}' },
    { id: 'rho_ρ', text: '运用密度心法求密度', answer: ['ρ', '=', 'm', '÷', 'V'], hint: '密度 等于 质量 除以 体积', display: 'ρ = \\dfrac{m}{V}' },
   //重力心法2个
    { id: 'G_m', text: '运用重力心法求质量', answer: ['m', '=', 'G', '÷', 'g'], hint: '质量 等于 重力 除以 g', display: 'm = \\dfrac{G}{g}' },
    { id: 'G_G', text: '运用重力心法求重力', answer: ['G', '=', 'm', '×', 'g'], hint: '重力 等于 质量 乘以 g', display: 'G = m g' },
   //压强心法3个
    { id: 'p_F', text: '运用压强心法求压力', answer: ['F', '=', 'p', '×', 'S'], hint: '压力 等于 压强 乘以 受力面积', display: 'F = p  S' },
    { id: 'p_p', text: '运用压强心法求压强', answer: ['p', '=', 'F', '÷', 'S'], hint: '压强 等于 压力 除以 受力面积', display: 'p = \\dfrac{F}{S}' },
    { id: 'p_S', text: '运用压强心法求受力面积', answer: ['S', '=', 'F', '÷', 'p'], hint: '受力面积 等于 压力 除以 压强', display: 'S = \\dfrac{F}{p}' },
   //液体压强心法1个
    { id: 'liquid_p', text: '运用液压心法求液体压强', answer: ['p', '=', 'ρ<sub>液</sub>', '×', 'g', '×', 'h'], hint: '液体压强 等于 液体密度 乘以 g 乘以 深度', display: 'p = \\rho_{\\text{液}}  g  h' },
    //浮力心法6个，4个公式加2个变形
    { id: 'buoyancy_arch1_V', text: '浮力心法之压力差法', answer: ['F<sub>浮</sub>', '=', 'F<sub>向上</sub>', '－', 'F<sub>向下</sub>'], hint: '浮力 等于 物体受到向上的压力 减去 向下的压力', display: 'F_{\\text{浮}} = F_{\\text{向上}} －F_{\\text{向下}}' },
    { id: 'buoyancy_arch2_V', text: '浮力心法之称重法', answer: ['F<sub>浮</sub>', '=', 'G', '－', 'F<sub>拉</sub>'], hint: '浮力 等于 物体的重力 减去 拉力', display: 'F_{\\text{浮}} = G －F_{\\text{拉}}' },
    { id: 'buoyancy_arch3_V', text: '浮力心法之阿基米德原理', answer: ['F<sub>浮</sub>', '=', 'ρ<sub>液</sub>', '×', 'g', '×', 'V<sub>排</sub>'], hint: '浮力 等于 液体密度 乘以 g 乘以 排开液体的体积', display: 'F_{\\text{浮}} = ρ_{\\text{液}}   g   V_{\\text{排}}' },
    { id: 'buoyancy_arch4_V', text: '浮力心法之平衡法', answer: ['F<sub>浮</sub>', '=', 'G<sub>物</sub>'], hint: '浮力 等于 物体的重力', display: 'F_{\\text{浮}} = G_{\\text{物}}' },
    { id: 'buoyancy_arch_V', text: '运用浮力心法求排开液体的体积', answer: ['V<sub>排</sub>', '=', 'F<sub>浮</sub>', '÷', 'g', '÷', 'ρ<sub>液</sub>'], hint: '排开体积 等于 浮力 除以 (g × 密度)', display: 'V_{\\text{排}} = \\dfrac{F_{\\text{浮}}}{g  \\rho_{\\text{液}}}' },
    { id: 'buoyancy_arch_ρ', text: '运用浮力心法求液体的密度',   answer: ['ρ<sub>液</sub>', '=', 'F<sub>浮</sub>', '÷', 'g', '÷', 'V<sub>排</sub>'], hint: '液体密度 等于 浮力 除以 (g × 排开体积)', display: '\\rho_{\\text{液}} = \\dfrac{F_{\\text{浮}}}{g  V_{\\text{排}}}' },
   //功心法3个
    { id: 'work_F', text: '运用功心法求力', answer: ['F', '=', 'W', '÷', 's'], hint: '力 等于 功 除以距离', display: 'F = \\dfrac{W}{s}' },
    { id: 'work_s', text: '运用功心法求距离', answer: ['s', '=', 'W', '÷', 'F'], hint: '距离 等于 功 除以力', display: 's = \\dfrac{W}{F}' },
    { id: 'work_W', text: '运用功心法求功', answer: ['W', '=', 'F', '×', 's'], hint: '功 等于 力 乘以 距离', display: 'W = F  s' },
    //功率心法4个，2个公式加3个变形
    { id: 'power_W', text: '运用机械功率心法求功', answer: ['W', '=', 'P', '×', 't'], hint: '功 等于 功率 乘以 时间', display: 'W = P  t' },
    { id: 'power_P', text: '运用机械功率心法求功率', answer: ['P', '=', 'W', '÷', 't'], hint: '功率 等于 功 除以 时间', display: 'P = \\dfrac{W}{t}' },
    { id: 'power_t', text: '运用机械功率心法求时间', answer: ['t', '=', 'W', '÷', 'P'], hint: '时间 等于 功 除以 功率', display: 't = \\dfrac{W}{P}' },
    { id: 'power_P2', text: '匀速直线运动时求功率', answer: ['P', '=', 'F', '×', 'v'], hint: '功率 等于 力 乘以 速度', display: 'P = F v' },
    { id: 'power_P2v', text: '运用功率心法求匀速直线运动时的速度', answer: ['v', '=', 'P', '÷', 'F'], hint: '速度 等于 功率 除以 力', display: 'v = \\dfrac{P}{F}' },
    { id: 'power_P2F', text: '运用功率心法求匀速直线运动时的力', answer: ['F', '=', 'P', '÷', 'v'], hint: '力 等于 功率 除以 速度', display: 'F = \\dfrac{P}{v}' },
    //杠杆平衡条件心法1个
    { id: 'lever_F1', text: '杠杆平衡条件', answer: ['F<sub>1</sub>', '×', 'l<sub>1</sub>', '=', 'F<sub>2</sub>', '×', 'l<sub>2</sub>'], hint: '动力×动力臂 = 阻力×阻力臂', display: 'F_1  l_1 = F_2  l_2' },
    //机械效率心法1个
    { id: 'efficiency', text: '求机械效率', answer: ['η', '=', 'W<sub>有</sub>', '÷', 'W<sub>总</sub>'], hint: '机械效率 等于 有用功 除以 总功', display: 'η = \\dfrac{W_{\\text{有}}}{W_{\\text{总}}}' },
   //比热容心法4个
    { id: 'heat_Q', text: '运用比热容心法求热量', answer: ['Q', '=', 'c', '×', 'm', '×', '△t'], hint: '热量 等于 比热容 乘以 质量 乘以 温度变化量', display: 'Q = c  m  \\Delta t' },
    { id: 'heat_m', text: '运用比热容心法求质量', answer: ['m', '=', 'Q', '÷', 'c', '÷', '△t'], hint: '质量 等于 热量 除以 (比热容 乘以 温度变化量)', display: 'm = \\dfrac{Q}{c \\Delta t}' },
    { id: 'heat_c', text: '运用比热容心法求比热容', answer: ['c', '=', 'Q', '÷', 'm', '÷', '△t'], hint: '比热容 等于 热量 除以 (质量 乘以 温度变化量)', display: 'c = \\dfrac{Q}{m  \\Delta t}' },
    { id: 'heat_△t', text: '运用比热容心法求温度的变化量', answer: ['△t', '=', 'Q', '÷', 'c', '÷', 'm'], hint: '温度变化量 等于 热量 除以 (比热容 乘以 质量)', display: '\\Delta t = \\dfrac{Q}{c m}' },
    //热值心法4个
    { id: 'heatval_m', text: '运用热值心法求燃料质量', answer: ['m', '=', 'Q', '÷', 'q'], hint: '质量 等于 热量 除以 热值', display: 'm = \\dfrac{Q}{q}' },
    { id: 'heatval_m1', text: '当热值单位为J/kg时，运用热值心法求燃料完全燃烧释放的热量', answer: ['Q', '=', 'm', '×', 'q'], hint: '热量 等于 质量 乘以 热值', display: 'Q = m  q' },
    { id: 'heatval_V', text: '运用热值心法求燃料体积', answer: ['V', '=', 'Q', '÷', 'q'], hint: '体积 等于 热量 除以 热值', display: 'V = \\dfrac{Q}{q}' },
    { id: 'heatval_V1', text: '当热值单位为J/m³时，运用热值心法求燃料完全燃烧释放的热量', answer: ['Q', '=', 'V', '×', 'q'], hint: '热量 等于 体积 乘以 热值', display: 'Q = V  q' },
     //热效率心法2个
    { id: 'thermaleff_water', text: '热效率心法之烧水类', answer: ['η', '=', 'Q<sub>吸</sub>', '÷', 'Q<sub>放</sub>'], hint: '热效率 等于 吸收热量 除以 放出的热量', display: 'η = \\dfrac{Q_{\\text{吸}}}{Q_{\\text{放}}}' },
    { id: 'thermaleff_car', text: '热效率心法之汽车行驶类', answer: ['η', '=', 'W<sub>有</sub>', '÷', 'Q<sub>放</sub>'], hint: '热效率 等于 有用功 除以 放出的热量', display: 'η = \\dfrac{W_{\\text{有}}}{Q_{\\text{放}}}' },
    //欧姆心法3个
    { id: 'ohm_U', text: '运用欧姆心法求电压', answer: ['U', '=', 'I', '×', 'R'], hint: '电压 等于 电流 乘以 电阻', display: 'U = I  R' },
    { id: 'ohm_R', text: '运用欧姆心法求电阻', answer: ['R', '=', 'U', '÷', 'I'], hint: '电阻 等于 电压 除以 电流', display: 'R = \\dfrac{U}{I}' },
    { id: 'ohm_I', text: '运用欧姆心法求电流', answer: ['I', '=', 'U', '÷', 'R'], hint: '电流 等于 电压 除以 电阻', display: 'I = \\dfrac{U}{R}' },
    //电功心法3个
    { id: 'elecwork_W', text: '运用电功心法求电功', answer: ['W', '=', 'U', '×', 'I', '×', 't'], hint: '电功 等于 电压 乘以 电流 乘以 时间', display: 'W = U I t' },
    //电功率心法8个，4个公式加4个变形
    { id: 'elecpower_def_P1', text: '电功率心法之定义式', answer: ['P', '=', 'W', '÷', 't'], hint: '功率 等于 电功 除以 时间', display: 'P = \\dfrac{W}{t}' },
    { id: 'elecpower_def_W', text: '运用电功率心法求电功', answer: ['W', '=', 'P', '×', 't'], hint: '电功 等于 功率 乘以 时间', display: 'W = P  t' },
    { id: 'elecpower_def_t', text: '运用电功率心法求时间', answer: ['t', '=', 'W', '÷', 'P'], hint: '时间 等于 电功 除以 功率', display: 't = \\dfrac{W}{P}' },
    { id: 'elecpower_def_P2', text: '电功率心法之测量式', answer: ['P', '=', 'U', '×', 'I'], hint: '功率 等于 电压 乘以 电流', display: 'P = U  I' },
    { id: 'elecpower_meas_I', text: '运用电功率心法之测量式求电流', answer: ['I', '=', 'P', '÷', 'U'], hint: '电流 等于 功率 除以 电压', display: 'I = \\dfrac{P}{U}' },
    { id: 'elecpower_def_P3', text: '电功率心法之串联型导出式', answer: ['P', '=', 'I<sup>2</sup>', '×', 'R'], hint: '功率等于电流的平方 乘以 电阻', display: 'P = I^2  R' },
    { id: 'elecpower_def_P4', text: '电功率心法之并联型导出式', answer: ['P', '=', 'U<sup>2</sup>', '÷', 'R'], hint: '功率等于电压的平方 除以 电阻', display: 'P = \\dfrac{U^2}{R}' },
    { id: 'elecpower_parallel_R', text: '运用电功率并联导出式求电阻', answer: ['R', '=', 'U<sup>2</sup>', '÷', 'P'], hint: '电阻等于电压的平方 除以 功率', display: 'R = \\dfrac{U^2}{P}' },
    //电热心法1个
    { id: 'elecheat_Q', text: '运用电热心法求电热', answer: ['Q', '=', 'I<sup>2</sup>', '×', 'R', '×', 't'], hint: '电热等于电流平方 乘以 电阻 乘以 时间', display: 'Q = I^2  R  t' }
];