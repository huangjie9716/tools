/* =========================================================
   教师任课名单（由 tools/sync-teacher-roster.mjs 生成）
   ---------------------------------------------------------
   本文件是一个加载器，按以下顺序取数据：
   1. 用 http(s) 打开页面时：读取 ../../../data/teacher-roster.json（改 JSON 立即生效）；
   2. 直接双击打开（file://）时：浏览器禁止读本地 JSON，退回使用本文件末尾的内嵌副本，
      此时改完 JSON 需要执行一次：node tools/sync-teacher-roster.mjs
   3. 页面加载后还会异步读取云端 teacher_assignments 表（管理员后台 ⑥ 任教名单 维护），
      云端有数据时以云端为准，并会让页面按新名单重绘。
   ========================================================= */
"use strict";

var JZ_ROSTER_EMBEDDED = {
  "schemaVersion": 1,
  "school": "珠海市九洲中学",
  "updatedAt": "2026-10-19",
  "source": "初一任教表.xlsx；初二任教表.xlsx；初三年级任教名单.xlsx",
  "subjectAliases": {
    "道法": "政治",
    "道德与法治": "政治",
    "体育与健康": "体育"
  },
  "grades": {
    "初一": {
      "label": "初一年级",
      "classes": {
        "1班": {
          "headTeacher": "王欢",
          "subjectTeachers": {
            "语文": "庞修齐",
            "数学": "王欢",
            "英语": "陈蕊",
            "政治": "高春",
            "历史": "郑招浩",
            "地理": "李秀艳",
            "生物": "胡政",
            "体育": "张锦"
          }
        },
        "2班": {
          "headTeacher": "梁志辉",
          "subjectTeachers": {
            "语文": "郭锦标",
            "数学": "陈小莉",
            "英语": "王嘉馨",
            "政治": "易永欣",
            "历史": "胡诗文",
            "地理": "梁志辉",
            "生物": "赖翠敏",
            "体育": "于婷婷"
          }
        },
        "3班": {
          "headTeacher": "王嘉馨",
          "subjectTeachers": {
            "语文": "郭锦标",
            "数学": "陈小莉",
            "英语": "王嘉馨",
            "政治": "易永欣",
            "历史": "胡诗文",
            "地理": "梁志辉",
            "生物": "赖翠敏",
            "体育": "于婷婷"
          }
        },
        "4班": {
          "headTeacher": "庞修齐",
          "subjectTeachers": {
            "语文": "庞修齐",
            "数学": "王欢",
            "英语": "陈蕊",
            "政治": "高春",
            "历史": "胡诗文",
            "地理": "李秀艳",
            "生物": "周冰雪",
            "体育": "张锦"
          }
        },
        "5班": {
          "headTeacher": "叶海莹",
          "subjectTeachers": {
            "语文": "黄梦梦",
            "数学": "苏树华",
            "英语": "叶海莹",
            "政治": "冯绮雯",
            "历史": "彭瑾",
            "地理": "申彤",
            "生物": "赖翠敏",
            "体育": "崔人双"
          }
        },
        "6班": {
          "headTeacher": "冯莉莉",
          "subjectTeachers": {
            "语文": "曾雅林",
            "数学": "唐昌明",
            "英语": "孔嘉玲",
            "政治": "冯绮雯",
            "历史": "彭瑾",
            "地理": "申彤",
            "生物": "张昊茁",
            "体育": "冯莉莉"
          }
        },
        "7班": {
          "headTeacher": "黄梦梦",
          "subjectTeachers": {
            "语文": "黄梦梦",
            "数学": "苏树华",
            "英语": "叶海莹",
            "政治": "冯绮雯",
            "历史": "彭瑾",
            "地理": "申彤",
            "生物": "张昊茁",
            "体育": "崔人双"
          }
        },
        "8班": {
          "headTeacher": "孔嘉玲",
          "subjectTeachers": {
            "语文": "曾雅林",
            "数学": "唐昌明",
            "英语": "孔嘉玲",
            "政治": "冯绮雯",
            "历史": "侯汉诚",
            "地理": "申彤",
            "生物": "张昊茁",
            "体育": "冯莉莉"
          }
        },
        "9班": {
          "headTeacher": "叶华",
          "subjectTeachers": {
            "语文": "林涛",
            "数学": "叶华",
            "英语": "张晓明",
            "政治": "易永欣",
            "历史": "彭瑾",
            "地理": "申彤",
            "生物": "赖翠敏",
            "体育": "吕德博"
          }
        },
        "10班": {
          "headTeacher": "申彤",
          "subjectTeachers": {
            "语文": "林涛",
            "数学": "叶华",
            "英语": "张晓明",
            "政治": "易永欣",
            "历史": "郑招浩",
            "地理": "申彤",
            "生物": "赖翠敏",
            "体育": "李明哲"
          }
        },
        "11班": {
          "headTeacher": "温伟豪",
          "subjectTeachers": {
            "语文": "张茗",
            "数学": "肖云霞",
            "英语": "傅瑛",
            "政治": "易永欣",
            "历史": "彭瑾",
            "地理": "梁志辉",
            "生物": "赖翠敏",
            "体育": "吕德博"
          }
        },
        "12班": {
          "headTeacher": "肖云霞",
          "subjectTeachers": {
            "语文": "张茗",
            "数学": "肖云霞",
            "英语": "傅瑛",
            "政治": "易永欣",
            "历史": "彭瑾",
            "地理": "梁志辉",
            "生物": "赖翠敏",
            "体育": "冯莉莉"
          }
        },
        "13班": {
          "headTeacher": "郑招浩",
          "subjectTeachers": {
            "语文": "黄安琦",
            "数学": "佘欣芷",
            "英语": "钟玲",
            "政治": "高春",
            "历史": "郑招浩",
            "地理": "李秀艳",
            "生物": "周冰雪",
            "体育": "李明哲"
          }
        },
        "14班": {
          "headTeacher": "李秀艳",
          "subjectTeachers": {
            "语文": "邓绍蓉",
            "数学": "王庆元",
            "英语": "许国凤",
            "政治": "高春",
            "历史": "郑招浩",
            "地理": "李秀艳",
            "生物": "胡政",
            "体育": "张锦"
          }
        },
        "15班": {
          "headTeacher": "黄安琦",
          "subjectTeachers": {
            "语文": "黄安琦",
            "数学": "佘欣芷",
            "英语": "钟玲",
            "政治": "高春",
            "历史": "郑招浩",
            "地理": "李秀艳",
            "生物": "周冰雪",
            "体育": "吕德博"
          }
        },
        "16班": {
          "headTeacher": "李明哲",
          "subjectTeachers": {
            "语文": "邓绍蓉",
            "数学": "王庆元",
            "英语": "许国凤",
            "政治": "高春",
            "历史": "郑招浩",
            "地理": "李秀艳",
            "生物": "周冰雪",
            "体育": "李明哲"
          }
        }
      }
    },
    "初二": {
      "label": "初二年级",
      "classes": {
        "1班": {
          "headTeacher": "宋晓玉",
          "subjectTeachers": {
            "语文": "刘艺琳",
            "数学": "宋晓玉",
            "英语": "石贤权",
            "物理": "黄结",
            "政治": "谢可咏",
            "历史": "旷瑜",
            "地理": "冼秋玲",
            "生物": "杨敏旭",
            "体育": "刘世美"
          }
        },
        "2班": {
          "headTeacher": "刘艺琳",
          "subjectTeachers": {
            "语文": "刘艺琳",
            "数学": "宋晓玉",
            "英语": "石贤权",
            "物理": "黄结",
            "政治": "谢可咏",
            "历史": "旷瑜",
            "地理": "冼秋玲",
            "生物": "杨敏旭",
            "体育": "刘世美"
          }
        },
        "3班": {
          "headTeacher": "旷瑜",
          "subjectTeachers": {
            "语文": "肖幸好",
            "数学": "曲欣",
            "英语": "马靓",
            "物理": "陈嘉婧",
            "政治": "覃坚勇",
            "历史": "旷瑜",
            "地理": "冼秋玲",
            "生物": "杨敏旭",
            "体育": "刘世美"
          }
        },
        "4班": {
          "headTeacher": "陈嘉婧",
          "subjectTeachers": {
            "语文": "肖幸好",
            "数学": "裴红梅",
            "英语": "马靓",
            "物理": "陈嘉婧",
            "政治": "覃坚勇",
            "历史": "旷瑜",
            "地理": "陈姗",
            "生物": "杨敏旭",
            "体育": "刘世美"
          }
        },
        "5班": {
          "headTeacher": "莫潍潍",
          "subjectTeachers": {
            "语文": "莫潍潍",
            "数学": "胡洁慧",
            "英语": "杨淋",
            "物理": "陈嘉婧",
            "政治": "覃坚勇",
            "历史": "徐斯琳",
            "地理": "陈姗",
            "生物": "徐子嫣",
            "体育": "张耀"
          }
        },
        "6班": {
          "headTeacher": "覃坚勇",
          "subjectTeachers": {
            "语文": "莫潍潍",
            "数学": "胡洁慧",
            "英语": "杨淋",
            "物理": "孙野",
            "政治": "覃坚勇",
            "历史": "徐斯琳",
            "地理": "陈姗",
            "生物": "徐子嫣",
            "体育": "张耀"
          }
        },
        "7班": {
          "headTeacher": "温佳赢",
          "subjectTeachers": {
            "语文": "郭轩硕",
            "数学": "温佳赢",
            "英语": "吴娇莹",
            "物理": "孙野",
            "政治": "覃坚勇",
            "历史": "侯汉诚",
            "地理": "陈姗",
            "生物": "徐子嫣",
            "体育": "张耀"
          }
        },
        "8班": {
          "headTeacher": "吴娇莹",
          "subjectTeachers": {
            "语文": "郭轩硕",
            "数学": "温佳赢",
            "英语": "吴娇莹",
            "物理": "李心怡",
            "政治": "覃坚勇",
            "历史": "侯汉诚",
            "地理": "冼秋玲",
            "生物": "徐子嫣",
            "体育": "张耀"
          }
        },
        "9班": {
          "headTeacher": "徐子嫣",
          "subjectTeachers": {
            "语文": "王攀红",
            "数学": "马春",
            "英语": "刘姝君",
            "物理": "李心怡",
            "政治": "刘萍萍",
            "历史": "侯汉诚",
            "地理": "冼秋玲",
            "生物": "徐子嫣",
            "体育": "赵多"
          }
        },
        "10班": {
          "headTeacher": "李曼",
          "subjectTeachers": {
            "语文": "王攀红",
            "数学": "马春",
            "英语": "李曼",
            "物理": "李心怡",
            "政治": "刘萍萍",
            "历史": "侯汉诚",
            "地理": "冼秋玲",
            "生物": "徐子嫣",
            "体育": "赵多"
          }
        },
        "11班": {
          "headTeacher": "徐斯琳",
          "subjectTeachers": {
            "语文": "黄蓉蓉",
            "数学": "赵翠",
            "英语": "吴雅文",
            "物理": "陈惠格",
            "政治": "刘萍萍",
            "历史": "徐斯琳",
            "地理": "凌文兵",
            "生物": "杨敏旭",
            "体育": "赵多"
          }
        },
        "12班": {
          "headTeacher": "黄蓉蓉",
          "subjectTeachers": {
            "语文": "黄蓉蓉",
            "数学": "赵翠",
            "英语": "吴雅文",
            "物理": "陈惠格",
            "政治": "刘萍萍",
            "历史": "徐斯琳",
            "地理": "凌文兵",
            "生物": "杨敏旭",
            "体育": "赵多"
          }
        },
        "13班": {
          "headTeacher": "安妍妍",
          "subjectTeachers": {
            "语文": "安妍妍",
            "数学": "张海洋",
            "英语": "黄莉",
            "物理": "陈惠格",
            "政治": "方良雅",
            "历史": "李俞烨",
            "地理": "凌文兵",
            "生物": "张昊茁",
            "体育": "李裕豪"
          }
        },
        "14班": {
          "headTeacher": "方良雅",
          "subjectTeachers": {
            "语文": "安妍妍",
            "数学": "张海洋",
            "英语": "黄莉",
            "物理": "彭清",
            "政治": "方良雅",
            "历史": "李俞烨",
            "地理": "凌文兵",
            "生物": "张昊茁",
            "体育": "李裕豪"
          }
        },
        "15班": {
          "headTeacher": "彭清",
          "subjectTeachers": {
            "语文": "高明洁",
            "数学": "柯碧华",
            "英语": "颜妍妮",
            "物理": "彭清",
            "政治": "刘萍萍",
            "历史": "李俞烨",
            "地理": "凌文兵",
            "生物": "张昊茁",
            "体育": "李裕豪"
          }
        },
        "16班": {
          "headTeacher": "李俞烨",
          "subjectTeachers": {
            "语文": "高明洁",
            "数学": "柯碧华",
            "英语": "颜妍妮",
            "物理": "彭清",
            "政治": "刘萍萍",
            "历史": "李俞烨",
            "地理": "凌文兵",
            "生物": "杨敏旭",
            "体育": "李裕豪"
          }
        }
      }
    },
    "初三": {
      "label": "初三年级",
      "classes": {
        "1班": {
          "headTeacher": "李乂京",
          "subjectTeachers": {
            "语文": "陈浩杰",
            "数学": "徐妍",
            "英语": "高尚",
            "物理": "张青",
            "化学": "李枝",
            "政治": "李乂京",
            "历史": "吴梦钏"
          }
        },
        "2班": {
          "headTeacher": "陈浩杰",
          "subjectTeachers": {
            "语文": "陈浩杰",
            "数学": "丁羽",
            "英语": "余诗垚",
            "物理": "王虹璎",
            "化学": "吴晶晶",
            "政治": "陆璐",
            "历史": "吴梦钏"
          }
        },
        "3班": {
          "headTeacher": "张敏红",
          "subjectTeachers": {
            "语文": "张敏红",
            "数学": "丁羽",
            "英语": "高普贤",
            "物理": "刘凯",
            "化学": "唐婉玲",
            "政治": "靳可欣",
            "历史": "张弛"
          }
        },
        "4班": {
          "headTeacher": "马腾隆",
          "subjectTeachers": {
            "语文": "马腾隆",
            "数学": "徐妍",
            "英语": "高普贤",
            "物理": "刘凯",
            "化学": "范文治",
            "政治": "靳可欣",
            "历史": "张弛"
          }
        },
        "5班": {
          "headTeacher": "张晴",
          "subjectTeachers": {
            "语文": "谭琴芳",
            "数学": "张晴",
            "英语": "高尚",
            "物理": "郑泽鸿",
            "化学": "唐婉玲",
            "政治": "靳可欣",
            "历史": "张弛"
          }
        },
        "6班": {
          "headTeacher": "郑泽鸿",
          "subjectTeachers": {
            "语文": "谭琴芳",
            "数学": "张晴",
            "英语": "余诗垚",
            "物理": "郑泽鸿",
            "化学": "范文治",
            "政治": "靳可欣",
            "历史": "张弛"
          }
        },
        "7班": {
          "headTeacher": "关源",
          "subjectTeachers": {
            "语文": "吕树一",
            "数学": "关源",
            "英语": "廖静怡",
            "物理": "邱似岳",
            "化学": "王真真",
            "政治": "许婉琪",
            "历史": "方圆"
          }
        },
        "8班": {
          "headTeacher": "吕树一",
          "subjectTeachers": {
            "语文": "吕树一",
            "数学": "关源",
            "英语": "廖静怡",
            "物理": "邱似岳",
            "化学": "王真真",
            "政治": "李乂京",
            "历史": "方圆"
          }
        },
        "9班": {
          "headTeacher": "王虹璎",
          "subjectTeachers": {
            "语文": "李心乐",
            "数学": "单莉",
            "英语": "张与珩",
            "物理": "王虹璎",
            "化学": "路文博",
            "政治": "许婉琪",
            "历史": "方圆"
          }
        },
        "10班": {
          "headTeacher": "路文博",
          "subjectTeachers": {
            "语文": "李心乐",
            "数学": "单莉",
            "英语": "张与珩",
            "物理": "张青",
            "化学": "路文博",
            "政治": "许婉琪",
            "历史": "方圆"
          }
        },
        "11班": {
          "headTeacher": "饶谦",
          "subjectTeachers": {
            "语文": "张敏红",
            "数学": "张庆勇",
            "英语": "刘诗洋",
            "物理": "饶谦",
            "化学": "罗苏萍",
            "政治": "许婉琪",
            "历史": "吴梦钏"
          }
        },
        "12班": {
          "headTeacher": "刘诗洋",
          "subjectTeachers": {
            "语文": "马腾隆",
            "数学": "张庆勇",
            "英语": "刘诗洋",
            "物理": "饶谦",
            "化学": "罗苏萍",
            "政治": "陆璐",
            "历史": "吴梦钏"
          }
        },
        "13班": {
          "headTeacher": "邝咏梅",
          "subjectTeachers": {
            "语文": "周志峰",
            "数学": "邝凤玲",
            "英语": "邝咏梅",
            "物理": "徐宏雪",
            "化学": "张景源",
            "政治": "方良雅",
            "历史": "赖隽"
          }
        },
        "14班": {
          "headTeacher": "张景源",
          "subjectTeachers": {
            "语文": "曾丽娜",
            "数学": "邝凤玲",
            "英语": "邝咏梅",
            "物理": "徐宏雪",
            "化学": "张景源",
            "政治": "方良雅",
            "历史": "赖隽"
          }
        },
        "15班": {
          "headTeacher": "黄晓玉",
          "subjectTeachers": {
            "语文": "王欢",
            "数学": "黄晓玉",
            "英语": "范蕾",
            "物理": "孔令红",
            "化学": "赵伟怡",
            "政治": "陆璐",
            "历史": "赖隽"
          }
        },
        "16班": {
          "headTeacher": "周志峰",
          "subjectTeachers": {
            "语文": "周志峰",
            "数学": "黄晓玉",
            "英语": "范蕾",
            "物理": "孔令红",
            "化学": "赵伟怡",
            "政治": "陆璐",
            "历史": "赖隽"
          }
        }
      }
    }
  }
};

var TEACHER_ROSTER = (function () {
  var url = "";
  try {
    var script = document.currentScript;
    var base = script && script.src ? script.src : "js/teacher-roster.js";
    url = new URL("../../../data/teacher-roster.json", base).href;
  } catch (e) {
    url = "";
  }
  try {
    if (url) {
      var xhr = new XMLHttpRequest();
      // 加时间戳绕开浏览器缓存，保证改完 JSON 刷新就能看到最新内容
      xhr.open("GET", url + (url.indexOf("?") >= 0 ? "&" : "?") + "_t=" + Date.now(), false);
      if (xhr.overrideMimeType) xhr.overrideMimeType("application/json");
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
        var live = JSON.parse(xhr.responseText);
        if (live && live.grades) {
          window.JZ_ROSTER_SOURCE = "json";
          return live;
        }
      }
    }
  } catch (e) {
    if (window.console && console.warn) {
      console.warn("教师任课名单：读取 data/teacher-roster.json 失败，已退回内嵌副本。", e);
    }
  }
  window.JZ_ROSTER_SOURCE = "embedded";
  return JZ_ROSTER_EMBEDDED;
})();

/* 云端名单（Supabase）优先：读到后原地替换 TEACHER_ROSTER，并通知页面重绘 */
(function () {
  function apply(roster) {
    if (!roster || !roster.grades || !Object.keys(roster.grades).length) return false;
    Object.keys(TEACHER_ROSTER).forEach(function (k) { delete TEACHER_ROSTER[k]; });
    Object.keys(roster).forEach(function (k) { TEACHER_ROSTER[k] = roster[k]; });
    window.JZ_ROSTER_SOURCE = "cloud";
    try {
      window.dispatchEvent(new CustomEvent("jz:roster-updated", { detail: roster }));
    } catch (e) { /* 老浏览器忽略 */ }
    return true;
  }
  function load() {
    if (!window.JZStore || typeof window.JZStore.getRoster !== "function") return;
    var ready = (window.JZCloud && typeof window.JZCloud.ready === "function")
      ? window.JZCloud.ready()
      : Promise.resolve();
    ready
      .then(function () { return window.JZStore.getRoster(); })
      .then(apply)
      .catch(function () { /* 云端未配置或表未建：继续使用本地副本 */ });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
