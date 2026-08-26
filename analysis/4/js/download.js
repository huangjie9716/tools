        // ============================================================
        //  下载对比表格 (Excel)
        // ============================================================
        function downloadDiffTable() {
            if (!currentResults || currentResults.classNames.length <= 1) {
                alert('没有可下载的对比数据。');
                return;
            }
            const { headers, classNames, diffMatrix } = currentResults;
            const data = [['班级', ...headers]];
            for (const cls of classNames) {
                if (cls === '全校') continue;
                const row = [cls];
                const diffs = diffMatrix[cls] || [];
                for (let i = 0; i < headers.length; i++) {
                    const val = diffs[i];
                    row.push(isFinite(val) ? Number(val.toFixed(4)) : '');
                }
                data.push(row);
            }
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '难度指数对比');
            XLSX.writeFile(wb, '难度指数对比.xlsx');
        }

        // ============================================================
        //  下载建议为Word文档
        // ============================================================
        function downloadSuggestionsFromGlobal(suggestionId) {
            const data = window[suggestionId];
            if (!data) {
                alert('数据已过期，请刷新页面后重试。');
                return;
            }
            downloadSuggestionsDoc(data.suggestions, data.headers);
        }

        function downloadSuggestionsDoc(suggestions, headers) {
            let bodyContent = '';
            let hasContent = false;

            for (const cls of Object.keys(suggestions)) {
                const items = suggestions[cls];
                if (items.length === 0) continue;
                hasContent = true;
                bodyContent += `<h2 style="color:#1a3a5c;margin-top:18px;margin-bottom:8px;"><svg style="width:16px;height:16px;vertical-align:-2px;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M500.241067 1011.950933a101.376 101.376 0 0 1-61.7472-20.855466L81.7664 718.626133A100.386133 100.386133 0 0 1 63.146667 577.160533L458.973867 65.621333a102.382933 102.382933 0 0 1 117.504-32.443733c11.3152 4.608 23.517867 6.570667 35.720533 5.768533l212.309333-16.554666c48.247467-3.857067 91.5968 29.252267 100.2496 76.561066l39.7824 215.278934c1.518933 7.867733 5.000533 15.240533 10.154667 21.418666a99.874133 99.874133 0 0 1 1.962667 125.422934L580.829867 972.612267a101.649067 101.649067 0 0 1-80.5888 39.338666z m-25.6-77.090133a43.298133 43.298133 0 0 0 60.3648-7.8848l385.536-498.295467c12.288-15.735467 11.946667-37.819733-0.785067-53.1968a101.239467 101.239467 0 0 1-21.640533-46.011733L859.3408 119.808a36.027733 36.027733 0 0 0-38.4-29.320533l-206.779733 16.145066a134.280533 134.280533 0 0 1-59.511467-9.284266 43.4176 43.4176 0 0 0-49.834667 13.789866L119.261867 609.450667a42.615467 42.615467 0 0 0 7.918933 59.989333L474.624 934.8608z" fill="#2B2B2B"></path><path d="M664.7808 470.528a132.693333 132.693333 0 1 1 105.472-51.831467 131.7888 131.7888 0 0 1-87.995733 50.688 133.290667 133.290667 0 0 1-17.476267 1.1264z m0.426667-206.421333l0 0z" fill="#D5AC86"></path></svg> ${cls}</h2>`;
                bodyContent += `<p style="font-size:14px;line-height:1.8;color:#2a4a6a;margin:6px 0 14px 0;">`;
                bodyContent += '<strong>重点关注题目：</strong>';
                const topics = items.map(item => {
                    const idx = item.index;
                    const topicName = headers[idx] || `题${idx+1}`;
                    return `${topicName} <span style="color:#b22234;">(差值 ${item.diff.toFixed(2)})</span>`;
                }).join('、');
                bodyContent += topics;
                bodyContent += `</p>`;
            }

            if (!hasContent) {
                bodyContent = '<p style="color:#28a745;font-size:15px;"><svg style="width:14px;height:14px;vertical-align:-1px;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M512 1024A512 512 0 1 1 512 0a512 512 0 0 1 0 1024z m-49.590857-377.197714L315.977143 498.614857 219.428571 590.848c70.217143 37.814857 168.594286 106.788571 252.854858 213.723429C531.821714 692.662857 715.337143 463.725714 804.571429 443.245714c-14.409143-57.709714-22.528-166.034286 0-223.817143-183.003429 120.685714-342.162286 427.373714-342.162286 427.373715z" fill="#029B00"></path></svg> 所有班级各题难度指数均不高于全校，无需特别改进。</p>';
            }

            const now = new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const htmlContent = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office"
                      xmlns:w="urn:schemas-microsoft-com:office:word"
                      xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                    <style>
                        @page { margin: 2cm 2.5cm; }
                        body { font-family: 'PingFang SC', 'Microsoft YaHei', 'SimSun', sans-serif; font-size: 14px; line-height: 1.8; color: #1e2a3a; }
                        h1 { font-size: 22px; color: #1a3a5c; text-align: center; border-bottom: 2px solid #2a5f7a; padding-bottom: 12px; }
                        h2 { font-size: 16px; color: #1a3a5c; margin-top: 16px; }
                        p { margin: 6px 0; }
                        .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 12px; color: #888; text-align: center; }
    </style>
</head>
<body>
    <h1>试题难度分析改进建议</h1>
    ${bodyContent}
    <p class="footer">生成时间：${now} &nbsp;|&nbsp; 试题分析系统</p>
</body>
</html>
`;

const bom = '\ufeff';
const blob = new Blob([bom + htmlContent], { type: 'application/msword;charset=UTF-8' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = '试题改进建议.doc';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
}