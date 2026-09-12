// ============================================================
// 团委学生处 - 工具卡片数据
// 结构：{ cards: [...], placeholder: { icon, text } }
//   cards       工具卡片数组（为空时显示 placeholder 占位卡片）
//   placeholder 占位卡片内容（可选）
// 卡片字段说明：
//   title      卡片标题
//   desc       简介
//   date       更新日期
//   version    版本号
//   file       data-file 值（用于自动获取更新日期）
//   href       跳转链接地址
//   action     'link' 普通跳转 | 'modal' 打开版本选择模态框
//   actionText 按钮文字
//   templates  数据模板下载 [{label, url}]
//   guides     操作指南下载 [{label, url}]
// ============================================================
window.CARDS_YOUTH = {
    cards: [
        {
            title: '珠海市九洲中学团委纪检管理系统',
            desc: '面向珠海市九洲中学团委的纪检管理工具，支持日常检查记录、班级量化评比与数据汇总统计，让团委工作更规范高效。',
            date: '2026.09.12',
            version: 'v1.0',
            file: 'student/1/YouthLeagueCommittee.html',
            href: 'student/1/YouthLeagueCommittee.html',
            action: 'link',
            actionText: '立即使用'
        }
    ],
    placeholder: null
};
