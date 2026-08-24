// ============================================================
// 物理教学 - 工具卡片数据
// 字段说明：
//   title      卡片标题
//   desc       简介
//   date       更新日期（默认显示，若 HEAD 请求成功会被自动替换）
//   version    版本号
//   file       data-file 值（用于自动获取更新日期）
//   href       跳转链接地址
//   action     'link' 普通跳转 | 'modal' 打开版本选择模态框
//   actionText 按钮文字
//   templates  数据模板下载 [{label, url}]
//   guides     操作指南下载 [{label, url}]
// ============================================================
window.CARDS_PHYSICS = [
    {
        title: '初中物理课堂知识PK赛',
        desc: '两人对战模式，涵盖初中物理课堂核心知识点，增强课堂互动与趣味性。',
        date: '2026.08.04',
        version: 'v1.1',
        file: 'physics/1/PhysicsClassGame.html',
        href: 'physics/1/PhysicsClassGame.html',
        action: 'link',
        actionText: '立即使用'
    },
    {
        title: '初中物理实验资源库',
        desc: '涵盖初中物理演示实验和学生实验，提供视频资源、模拟软件、习题资源，致力成为老师和学生们宝贵的学习财富！',
        date: '2026.08.04',
        version: 'v1.1',
        file: 'physics/2/PhysicsExperiment.html',
        href: 'physics/2/PhysicsExperiment.html',
        action: 'link',
        actionText: '立即使用'
    },
     {
        title: '笑傲江湖',
        desc: '初中物理的每一个公式，都是江湖中失传的武功秘籍。 玩家从一名初入江湖的菜鸟开始，在门派中修炼成长……',
        date: '2026.08.24',
        version: 'v1.1',
        file: 'physics/3/FormulaGame.html',
        href: 'physics/3/FormulaGame.html',
        action: 'link',
        actionText: '立即使用'
    }
];
