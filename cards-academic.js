// ============================================================
// 教务处 - 工具卡片数据
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
window.CARDS_ACADEMIC = {
    cards: [
        {
            title: '珠海市九洲中学教育质量管理与分析系统',
            desc: '',
            date: '2026.11.4',
            version: 'v1.0',
            file: 'academic/educational/jzzx-analysis.html',
            href: 'academic/educational/jzzx-analysis.html',
            action: 'link',
            actionText: '立即使用',
            video: ''
        }
    ],
    placeholder: null
};
