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
//   video      操作指南视频链接（点击卡片“操作指南”按钮全屏弹窗播放，留空则显示“制作中”）
// ============================================================
window.CARDS_PHYSICS = [
    {
        title: '初中物理课堂知识PK赛',
        desc: '两人对战模式，涵盖初中物理课堂核心知识点，增强课堂互动与趣味性。',
        date: '2026.09.17',
        version: 'v1.2',
        file: 'physics/classroom-knowledge/knowledge-pk.html',
        href: 'physics/classroom-knowledge/knowledge-pk.html',
        action: 'link',
        actionText: '立即使用',
        video: 'https://www.bilibili.com/video/BV1pHeu6UEci/?spm_id_from=333.1387.homepage.video_card.click&vd_source=53e653f3462e0a0b07cbf67766ff0d27'
    },
    {
        title: '初中物理实验资源库',
        desc: '涵盖初中物理演示实验和学生实验，提供视频资源、模拟软件、习题资源，致力成为老师和学生们宝贵的学习财富！',
        date: '2026.09.17',
        version: 'v1.2',
        file: 'physics/physics-experiment/experiment-resource-library.html',
        href: 'physics/physics-experiment/experiment-resource-library.html',
        action: 'link',
        actionText: '立即使用',
        video: 'https://www.bilibili.com/video/BV1HHeu6UEg6/?spm_id_from=333.1387.homepage.video_card.click&vd_source=53e653f3462e0a0b07cbf67766ff0d27'
    },
     {
        title: '笑傲江湖',
        desc: '初中物理的每一个公式，都是江湖中失传的武功秘籍。 玩家从一名初入江湖的菜鸟开始，在门派中修炼成长……',
        date: '2026.08.24',
        version: 'v1.1',
        file: 'physics/formula/the-legendary-swordsman.html',
        href: 'physics/formula/the-legendary-swordsman.html',
        action: 'link',
        actionText: '立即使用',
        video: 'https://www.bilibili.com/video/BV1cHeu6mErw/?spm_id_from=333.1387.homepage.video_card.click&vd_source=53e653f3462e0a0b07cbf67766ff0d27'
    },
     {
        title: '光的反射游戏实验室',
        desc: '一个用游戏讲清“光的反射”的小实验室：拖动平面镜与激光笔，让反射光线击中怪物，在动手操作中直观看到光反射定律。',
        date: '2026.10.12',
        version: 'v1.0',
        file: 'physics/light-reflect/light-reflect-game-lab.html',
        href: 'physics/light-reflect/light-reflect-game-lab.html',
        action: 'link',
        actionText: '立即使用',
        video: ''
    },
    {
        title: '珠海市九洲中学2025级学生物理小组积分可视化系统',
        desc: '珠海市九洲中学2025级1班和2班专用，小组合作探究学习崭新模式',
        date: '2026.08.30',
        version: 'v1.1',
        file: 'physics/class/group-cooperation.html',
        href: 'physics/class/group-cooperation.html',
        action: 'link',
        actionText: '立即使用',
        video: ''
    }
];
