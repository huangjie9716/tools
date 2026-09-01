        // ================================================================
        //  1. 完整单词数据（7-9年级 · 2024新人教版 Go for it!）
        //    按 书册 -> 单元 -> 单词列表 组织
        //    每个单词: { en, zh, phonetic?, pos? }
        // ================================================================
        const WORD_DATA = {

            // ===================== 七年级上册 =====================
            '七年级上册': {
                units: [{
                    name: 'Starter Unit 1 Hello!',
                    words: [
                        { en: 'hello', zh: '你好' },
                        { en: 'hi', zh: '嗨' },
                        { en: 'good', zh: '好的' },
                        { en: 'morning', zh: '早晨；上午' },
                        { en: 'afternoon', zh: '下午' },
                        { en: 'evening', zh: '晚上；傍晚' },
                        { en: 'how', zh: '怎样；如何' },
                        { en: 'are', zh: '是' },
                        { en: 'you', zh: '你；你们' },
                        { en: 'fine', zh: '健康的；美好的' },
                        { en: 'thanks', zh: '感谢；谢谢' },
                        { en: 'OK', zh: '好；可以' },
                        { en: 'name', zh: '名字；名称' },
                        { en: 'I', zh: '我' },
                        { en: 'am', zh: '是' },
                        { en: 'is', zh: '是' },
                        { en: 'my', zh: '我的' },
                        { en: 'goodbye', zh: '再见' },
                        { en: 'what', zh: '什么' },
                        { en: 'this', zh: '这；这个' }
                    ]
                }, {
                    name: 'Starter Unit 2 Keep Tidy!',
                    words: [
                        { en: 'book', zh: '书' },
                        { en: 'pen', zh: '钢笔' },
                        { en: 'pencil', zh: '铅笔' },
                        { en: 'eraser', zh: '橡皮' },
                        { en: 'ruler', zh: '尺子' },
                        { en: 'bag', zh: '包；书包' },
                        { en: 'box', zh: '箱；盒' },
                        { en: 'pencil box', zh: '铅笔盒；文具盒' },
                        { en: 'desk', zh: '书桌' },
                        { en: 'chair', zh: '椅子' },
                        { en: 'on', zh: '在…上面' },
                        { en: 'in', zh: '在…里面' },
                        { en: 'under', zh: '在…下面' },
                        { en: 'where', zh: '在哪里；到哪里' },
                        { en: 'they', zh: '他（她、它）们' }
                    ]
                }, {
                    name: 'Starter Unit 3 Welcome!',
                    words: [
                        { en: 'friend', zh: '朋友' },
                        { en: 'new', zh: '新的' },
                        { en: 'student', zh: '学生' },
                        { en: 'boy', zh: '男孩' },
                        { en: 'girl', zh: '女孩' },
                        { en: 'meet', zh: '遇见；相逢' },
                        { en: 'class', zh: '班级；课' },
                        { en: 'Miss', zh: '小姐' },
                        { en: 'Mr.', zh: '先生' },
                        { en: 'Ms.', zh: '女士' },
                        { en: 'too', zh: '也；又；太' }
                    ]
                }, {
                    name: 'Unit 1 You and Me',
                    words: [
                        { en: 'he', zh: '他' },
                        { en: 'she', zh: '她' },
                        { en: 'is', zh: '是' },
                        { en: 'boy', zh: '男孩' },
                        { en: 'girl', zh: '女孩' },
                        { en: 'his', zh: '他的' },
                        { en: 'her', zh: '她的' },
                        { en: 'yes', zh: '是的；对' },
                        { en: 'this', zh: '这；这个' },
                        { en: 'that', zh: '那；那个' },
                        { en: 'these', zh: '这些' },
                        { en: 'those', zh: '那些' },
                        { en: 'who', zh: '谁；什么人' }
                    ]
                }, {
                    name: 'Unit 2 We\'re Family!',
                    words: [
                        { en: 'family', zh: '家；家庭' },
                        { en: 'parent', zh: '父（母）亲' },
                        { en: 'mother', zh: '母亲；妈妈' },
                        { en: 'father', zh: '父亲；爸爸' },
                        { en: 'mom', zh: '妈妈' },
                        { en: 'dad', zh: '爸爸' },
                        { en: 'grandparent', zh: '祖父（母）；外祖父（母）' },
                        { en: 'grandma', zh: '祖母；外祖母' },
                        { en: 'grandpa', zh: '祖父；外祖父' },
                        { en: 'cousin', zh: '堂（表）兄弟姐妹' },
                        { en: 'aunt', zh: '姑母；姨母；伯母；婶母；舅母' },
                        { en: 'uncle', zh: '舅父；叔父；伯父；姑父；姨父' }
                    ]
                }, {
                    name: 'Unit 3 My School',
                    words: [
                        { en: 'school', zh: '学校' },
                        { en: 'classroom', zh: '教室' },
                        { en: 'library', zh: '图书馆' },
                        { en: 'playground', zh: '操场' },
                        { en: 'office', zh: '办公室' },
                        { en: 'room', zh: '房间' },
                        { en: 'teacher', zh: '教师' },
                        { en: 'student', zh: '学生' },
                        { en: 'card', zh: '卡片' },
                        { en: 'school ID card', zh: '学生卡' },
                        { en: 'some', zh: '一些；某些' }
                    ]
                }, {
                    name: 'Unit 4 My Favourite Subject',
                    words: [
                        { en: 'subject', zh: '学科；科目' },
                        { en: 'math', zh: '数学' },
                        { en: 'English', zh: '英语；英语课' },
                        { en: 'favourite', zh: '特别喜爱的' },
                        { en: 'science', zh: '科学' },
                        { en: 'art', zh: '美术；艺术' },
                        { en: 'music', zh: '音乐' },
                        { en: 'geography', zh: '地理' },
                        { en: 'history', zh: '历史' },
                        { en: 'because', zh: '因为' }
                    ]
                }, {
                    name: 'Unit 5 Fun Clubs',
                    words: [
                        { en: 'club', zh: '俱乐部；社团' },
                        { en: 'swim', zh: '游泳' },
                        { en: 'dance', zh: '跳舞' },
                        { en: 'sing', zh: '唱歌' },
                        { en: 'join', zh: '参加；加入' },
                        { en: 'draw', zh: '画' },
                        { en: 'chess', zh: '国际象棋' },
                        { en: 'play chess', zh: '下国际象棋' },
                        { en: 'speak', zh: '说（某种语言）；说话' },
                        { en: 'tell', zh: '讲述；告诉' }
                    ]
                }, {
                    name: 'Unit 6 A Day in My Life',
                    words: [
                        { en: 'get up', zh: '起床' },
                        { en: 'breakfast', zh: '早餐；早饭' },
                        { en: 'go to school', zh: '去上学' },
                        { en: "o'clock", zh: '…点钟' },
                        { en: 'late', zh: '迟到' },
                        { en: 'lunch', zh: '午餐' },
                        { en: 'dinner', zh: '（中午或晚上吃的）正餐' },
                        { en: 'home', zh: '家；到家；在家' },
                        { en: 'go home', zh: '回家' },
                        { en: 'bed', zh: '床' },
                        { en: 'go to bed', zh: '上床睡觉' }
                    ]
                }, {
                    name: 'Unit 7 Happy Holidays',
                    words: [
                        { en: 'birthday', zh: '生日' },
                        { en: 'party', zh: '聚会' },
                        { en: 'when', zh: '什么时候；何时' },
                        { en: 'month', zh: '月；月份' },
                        { en: 'happy', zh: '愉快的；高兴的' },
                        { en: 'gift', zh: '礼物' },
                        { en: 'old', zh: '年老的；旧的' },
                        { en: 'how old', zh: '多大年纪；几岁' },
                        { en: 'number', zh: '号码；数字' }
                    ]
                }]
            },

            // ===================== 七年级下册 =====================
            '七年级下册': {
                units: [{
                    name: 'Unit 1 Animal Friends',
                    words: [
                        { en: 'animal', zh: '动物' },
                        { en: 'dog', zh: '狗' },
                        { en: 'cute', zh: '可爱的；机灵的' },
                        { en: 'panda', zh: '熊猫' },
                        { en: 'zoo', zh: '动物园' },
                        { en: 'tiger', zh: '老虎' },
                        { en: 'smart', zh: '聪明的' },
                        { en: 'save', zh: '救；救助' },
                        { en: 'lazy', zh: '懒惰的；懒散的' },
                        { en: 'kind', zh: '种类' },
                        { en: 'water', zh: '水' }
                    ]
                }, {
                    name: 'Unit 2 No Rules, No Order',
                    words: [
                        { en: 'rule', zh: '规则；规章' },
                        { en: 'arrive', zh: '到达' },
                        { en: 'hall', zh: '大厅；礼堂' },
                        { en: 'listen', zh: '听；倾听' },
                        { en: 'fight', zh: '打架；战斗' },
                        { en: 'uniform', zh: '校服；制服' },
                        { en: 'respect', zh: '尊重' },
                        { en: 'quiet', zh: '安静的' },
                        { en: 'outside', zh: '在外面；外面的' },
                        { en: 'practice', zh: '练习' }
                    ]
                }, {
                    name: 'Unit 3 Keep Fit',
                    words: [
                        { en: 'health', zh: '健康' },
                        { en: 'exercise', zh: '锻炼；练习' },
                        { en: 'ride', zh: '骑；旅程' },
                        { en: 'bike', zh: '自行车；脚踏车' },
                        { en: 'run', zh: '跑；奔跑' },
                        { en: 'strong', zh: '强壮的' },
                        { en: 'sleep', zh: '睡觉' },
                        { en: 'early', zh: '早（的）' },
                        { en: 'important', zh: '重要的' },
                        { en: 'relax', zh: '放松；休息' }
                    ]
                }, {
                    name: 'Unit 4 Eat Well',
                    words: [
                        { en: 'food', zh: '食物' },
                        { en: 'vegetable', zh: '蔬菜' },
                        { en: 'fruit', zh: '水果' },
                        { en: 'rice', zh: '大米；米饭' },
                        { en: 'meat', zh: '肉' },
                        { en: 'drink', zh: '喝；饮料' },
                        { en: 'balanced', zh: '均衡的' },
                        { en: 'milk', zh: '牛奶' },
                        { en: 'bread', zh: '面包' },
                        { en: 'hamburger', zh: '汉堡包' }
                    ]
                }, {
                    name: 'Unit 5 Here and Now',
                    words: [
                        { en: 'today', zh: '今天' },
                        { en: 'station', zh: '车站；电台' },
                        { en: 'man', zh: '男人；人' },
                        { en: 'newspaper', zh: '报纸' },
                        { en: 'use', zh: '使用；运用' },
                        { en: 'festival', zh: '节日' },
                        { en: 'message', zh: '信息；消息' },
                        { en: 'pool', zh: '游泳池；水池' },
                        { en: 'shop', zh: '购物；商店' },
                        { en: 'supermarket', zh: '超市' }
                    ]
                }, {
                    name: 'Unit 6 Rain or Shine',
                    words: [
                        { en: 'weather', zh: '天气' },
                        { en: 'rain', zh: '下雨；雨' },
                        { en: 'wind', zh: '风' },
                        { en: 'snow', zh: '下雪；雪' },
                        { en: 'cloud', zh: '云' },
                        { en: 'sunny', zh: '晴朗的' },
                        { en: 'cloudy', zh: '多云的' },
                        { en: 'windy', zh: '多风的' },
                        { en: 'rainy', zh: '阴雨的；多雨的' },
                        { en: 'cold', zh: '寒冷的；冷的' },
                        { en: 'hot', zh: '热的' },
                        { en: 'warm', zh: '温暖的' },
                        { en: 'cool', zh: '凉爽的' }
                    ]
                }, {
                    name: 'Unit 7 A Day to Remember',
                    words: [
                        { en: 'trip', zh: '旅行；旅游' },
                        { en: 'museum', zh: '博物馆' },
                        { en: 'visit', zh: '参观；访问' },
                        { en: 'fire', zh: '火；火灾' },
                        { en: 'paint', zh: '绘画' },
                        { en: 'exciting', zh: '令人激动的' },
                        { en: 'gift', zh: '礼物；赠品' },
                        { en: 'lovely', zh: '可爱的' },
                        { en: 'cheap', zh: '廉价的；便宜的' },
                        { en: 'expensive', zh: '昂贵的' }
                    ]
                }, {
                    name: 'Unit 8 Once upon a Time',
                    words: [
                        { en: 'story', zh: '故事' },
                        { en: 'magic', zh: '有魔力的' },
                        { en: 'once', zh: '一次；曾经' },
                        { en: 'ago', zh: '以前' },
                        { en: 'bear', zh: '熊' },
                        { en: 'brave', zh: '勇敢的' },
                        { en: 'clever', zh: '聪明的' },
                        { en: 'forest', zh: '森林' },
                        { en: 'house', zh: '房子' },
                        { en: 'gold', zh: '金子；黄金' }
                    ]
                }]
            },

            // ===================== 八年级上册 =====================
            '八年级上册': {
                units: [{
                    name: 'Unit 1 People Around Us',
                    words: [
                        { en: 'anyone', zh: '任何人' },
                        { en: 'wonderful', zh: '绝妙的；了不起的' },
                        { en: 'few', zh: '很少；不多' },
                        { en: 'most', zh: '大多数；大部分' },
                        { en: 'something', zh: '某物；某事' },
                        { en: 'activity', zh: '活动' },
                        { en: 'decide', zh: '决定；选定' },
                        { en: 'try', zh: '尝试；设法；努力' },
                        { en: 'bird', zh: '鸟' },
                        { en: 'building', zh: '建筑物；房子' }
                    ]
                }, {
                    name: 'Unit 2 Daily Habits',
                    words: [
                        { en: 'housework', zh: '家务劳动' },
                        { en: 'hardly', zh: '几乎不；几乎没有' },
                        { en: 'ever', zh: '在任何时候；从来；曾经' },
                        { en: 'once', zh: '一次' },
                        { en: 'twice', zh: '两次' },
                        { en: 'result', zh: '结果；后果' },
                        { en: 'percent', zh: '百分之…' },
                        { en: 'online', zh: '在线（的）' },
                        { en: 'television', zh: '电视节目；电视机' },
                        { en: 'although', zh: '虽然；尽管' }
                    ]
                }, {
                    name: 'Unit 3 Friends',
                    words: [
                        { en: 'outgoing', zh: '外向的' },
                        { en: 'better', zh: '更好的（地）；较好的（地）' },
                        { en: 'loudly', zh: '大声地；喧闹地' },
                        { en: 'quietly', zh: '轻声地；安静地' },
                        { en: 'hard-working', zh: '工作努力的；辛勤的' },
                        { en: 'talented', zh: '有才能的；有才干的' },
                        { en: 'serious', zh: '严肃的；稳重的' },
                        { en: 'mirror', zh: '镜子' },
                        { en: 'necessary', zh: '必需的；必要的' },
                        { en: 'reach', zh: '伸手；到达；抵达' }
                    ]
                }, {
                    name: 'Unit 4 Our World',
                    words: [
                        { en: 'theater', zh: '剧院；剧场' },
                        { en: 'comfortable', zh: '使人舒服的；舒适的' },
                        { en: 'seat', zh: '座位；坐处' },
                        { en: 'screen', zh: '银幕；屏幕' },
                        { en: 'close', zh: '接近' },
                        { en: 'creative', zh: '有创造力的；创造性的' },
                        { en: 'winner', zh: '获胜者；优胜者' },
                        { en: 'prize', zh: '奖；奖品；奖金' },
                        { en: 'example', zh: '实例；范例' },
                        { en: 'poor', zh: '贫穷的；清贫的' }
                    ]
                }, {
                    name: 'Unit 5 Culture & Ideas',
                    words: [
                        { en: 'news', zh: '新闻；消息' },
                        { en: 'plan', zh: '打算；计划' },
                        { en: 'hope', zh: '希望' },
                        { en: 'talk show', zh: '脱口秀' },
                        { en: 'soap opera', zh: '肥皂剧' },
                        { en: 'happen', zh: '发生；出现' },
                        { en: 'expect', zh: '预料；期待' },
                        { en: 'joke', zh: '笑话；玩笑' },
                        { en: 'comedy', zh: '喜剧；喜剧片' },
                        { en: 'meaningless', zh: '无意义的；意思不明确的' }
                    ]
                }, {
                    name: 'Unit 6 Future Dreams',
                    words: [
                        { en: 'doctor', zh: '医生' },
                        { en: 'engineer', zh: '工程师' },
                        { en: 'cook', zh: '厨师；烹饪' },
                        { en: 'violinist', zh: '小提琴手' },
                        { en: 'driver', zh: '驾驶员；司机' },
                        { en: 'promise', zh: '承诺；诺言' },
                        { en: 'resolution', zh: '决心；决定' },
                        { en: 'improve', zh: '改进；改善' },
                        { en: 'physical', zh: '身体的' },
                        { en: 'self-improvement', zh: '自我改进；自我提高' }
                    ]
                }, {
                    name: 'Unit 7 Our Future',
                    words: [
                        { en: 'paper', zh: '纸；纸张' },
                        { en: 'pollution', zh: '污染；污染物' },
                        { en: 'future', zh: '将来；未来' },
                        { en: 'pollute', zh: '污染' },
                        { en: 'environment', zh: '环境' },
                        { en: 'astronaut', zh: '宇航员；航天员' },
                        { en: 'believe', zh: '相信；认为有可能' },
                        { en: 'disagree', zh: '不同意；持不同意见；有分歧' },
                        { en: 'shape', zh: '形状；外形' },
                        { en: 'possible', zh: '可能的' }
                    ]
                }, {
                    name: 'Unit 8 Food',
                    words: [
                        { en: 'shake', zh: '奶昔' },
                        { en: 'pour', zh: '倾倒；倒出' },
                        { en: 'yogurt', zh: '酸奶；酸乳酪' },
                        { en: 'honey', zh: '蜂蜜' },
                        { en: 'watermelon', zh: '西瓜' },
                        { en: 'traditional', zh: '传统的；惯例的' },
                        { en: 'celebrate', zh: '庆祝；庆贺' },
                        { en: 'pepper', zh: '胡椒粉；辣椒' },
                        { en: 'oven', zh: '烤箱；烤炉' },
                        { en: 'serve', zh: '接待；服务；提供' }
                    ]
                }, {
                    name: 'Unit 9 Invitations',
                    words: [
                        { en: 'prepare', zh: '使做好准备；把…准备好' },
                        { en: 'exam', zh: '考试' },
                        { en: 'available', zh: '有空的；可获得的' },
                        { en: 'until', zh: '到…时；直到…为止' },
                        { en: 'hang', zh: '悬挂；垂下' },
                        { en: 'refuse', zh: '拒绝' },
                        { en: 'accept', zh: '接受' },
                        { en: 'invitation', zh: '邀请；请柬' },
                        { en: 'reply', zh: '回答；答复' },
                        { en: 'forward', zh: '转寄；发送；向前' }
                    ]
                }, {
                    name: 'Unit 10 Choices',
                    words: [
                        { en: 'meeting', zh: '会议；集会；会面' },
                        { en: 'video', zh: '录像带；录像' },
                        { en: 'organize', zh: '组织；筹备' },
                        { en: 'chocolate', zh: '巧克力' },
                        { en: 'upset', zh: '难过；失望；沮丧' },
                        { en: 'advice', zh: '劝告；建议' },
                        { en: 'travel', zh: '旅行；游历' },
                        { en: 'agent', zh: '代理人；经纪人' },
                        { en: 'expert', zh: '专家' },
                        { en: 'solve', zh: '解决；解答' }
                    ]
                }]
            },

            // ===================== 八年级下册 =====================
            '八年级下册': {
                units: [{
                    name: 'Unit 1 Health',
                    words: [
                        { en: 'matter', zh: '问题；事情' },
                        { en: 'sore', zh: '疼痛的；酸痛的' },
                        { en: 'stomachache', zh: '胃痛；腹痛' },
                        { en: 'foot', zh: '脚；足' },
                        { en: 'neck', zh: '脖子' },
                        { en: 'risk', zh: '危险；风险' },
                        { en: 'spirit', zh: '勇气；意志' },
                        { en: 'death', zh: '死；死亡' },
                        { en: 'decision', zh: '决定；抉择' },
                        { en: 'control', zh: '限制；约束；管理' }
                    ]
                }, {
                    name: 'Unit 2 Volunteering',
                    words: [
                        { en: 'volunteer', zh: '义务做；自愿做；志愿者' },
                        { en: 'cheer', zh: '欢呼；喝彩' },
                        { en: 'lonely', zh: '孤独的；寂寞的' },
                        { en: 'several', zh: '几个；数个；一些' },
                        { en: 'notice', zh: '通知；通告；注意；注意到' },
                        { en: 'repair', zh: '修理；修补' },
                        { en: 'disabled', zh: '丧失能力的；有残疾的' },
                        { en: 'fix', zh: '修理；安装' },
                        { en: 'broken', zh: '破损的；残缺的' },
                        { en: 'wheel', zh: '车轮；轮子' }
                    ]
                }, {
                    name: 'Unit 3 Chores',
                    words: [
                        { en: 'rubbish', zh: '垃圾；废弃物' },
                        { en: 'fold', zh: '折叠；对折' },
                        { en: 'sweep', zh: '扫；打扫' },
                        { en: 'floor', zh: '地板' },
                        { en: 'mess', zh: '杂乱；不整洁' },
                        { en: 'fairness', zh: '公平；公正' },
                        { en: 'depend', zh: '依靠；信赖' },
                        { en: 'develop', zh: '发展；壮大' },
                        { en: 'independence', zh: '独立' },
                        { en: 'fair', zh: '合理的；公平的' }
                    ]
                }, {
                    name: 'Unit 4 Communication',
                    words: [
                        { en: 'allow', zh: '允许；准许' },
                        { en: 'wrong', zh: '错误的；不对的' },
                        { en: 'guess', zh: '猜测；估计' },
                        { en: 'deal', zh: '协议；交易' },
                        { en: 'relation', zh: '关系；联系；交往' },
                        { en: 'communicate', zh: '交流；沟通' },
                        { en: 'argue', zh: '争论；争吵' },
                        { en: 'cloud', zh: '云；云朵' },
                        { en: 'elder', zh: '年纪较长的' },
                        { en: 'instead', zh: '代替；反而；却' }
                    ]
                }, {
                    name: 'Unit 5 Unexpected Events',
                    words: [
                        { en: 'rainstorm', zh: '暴风雨' },
                        { en: 'alarm', zh: '闹钟' },
                        { en: 'begin', zh: '开始' },
                        { en: 'heavily', zh: '在很大程度上；大量地' },
                        { en: 'suddenly', zh: '突然；忽然' },
                        { en: 'realize', zh: '理解；领会；意识到' },
                        { en: 'silence', zh: '沉默；缄默；无声' },
                        { en: 'recently', zh: '不久前；最近' },
                        { en: 'truth', zh: '实情；事实' },
                        { en: 'completely', zh: '彻底地；完全地' }
                    ]
                }, {
                    name: 'Unit 6 Legends',
                    words: [
                        { en: 'shoot', zh: '射击；发射' },
                        { en: 'magic', zh: '有魔力的；有神奇力量的' },
                        { en: 'stick', zh: '棍；条' },
                        { en: 'fit', zh: '适合；合身' },
                        { en: 'couple', zh: '（尤指）夫妻；两人；一对' },
                        { en: 'silly', zh: '愚蠢的；傻的' },
                        { en: 'object', zh: '物体；物品' },
                        { en: 'hide', zh: '隐藏；隐蔽' },
                        { en: 'tail', zh: '尾巴' },
                        { en: 'magic stick', zh: '魔法棍' }
                    ]
                }, {
                    name: 'Unit 7 World Facts',
                    words: [
                        { en: 'mountain', zh: '山；山脉' },
                        { en: 'desert', zh: '沙漠' },
                        { en: 'population', zh: '人口；人口数量' },
                        { en: 'Asia', zh: '亚洲' },
                        { en: 'tour', zh: '旅行；旅游' },
                        { en: 'ancient', zh: '古代的；古老的' },
                        { en: 'protect', zh: '保护；防护' },
                        { en: 'wide', zh: '宽的；宽阔的' },
                        { en: 'achievement', zh: '成就；成绩' },
                        { en: 'include', zh: '包括；包含' }
                    ]
                }, {
                    name: 'Unit 8 Literature',
                    words: [
                        { en: 'treasure', zh: '珠宝；财富' },
                        { en: 'island', zh: '岛' },
                        { en: 'page', zh: '（书刊或纸张的）页，面，张' },
                        { en: 'hurry', zh: '匆忙；赶快' },
                        { en: 'ship', zh: '船' },
                        { en: 'forever', zh: '永远' },
                        { en: 'belong', zh: '属于' },
                        { en: 'land', zh: '陆地；大地' },
                        { en: 'fiction', zh: '小说' },
                        { en: 'technology', zh: '科技；工艺' }
                    ]
                }, {
                    name: 'Unit 9 Experiences',
                    words: [
                        { en: 'amusement', zh: '娱乐；游戏' },
                        { en: 'somewhere', zh: '在某处；到某处' },
                        { en: 'camera', zh: '照相机；摄影机；摄像机' },
                        { en: 'invent', zh: '发明；创造' },
                        { en: 'invention', zh: '发明；发明物' },
                        { en: 'perfect', zh: '完美的；完全的' },
                        { en: 'collect', zh: '收集；采集' },
                        { en: 'province', zh: '省份' },
                        { en: 'safe', zh: '安全的；无危险的' },
                        { en: 'simply', zh: '仅仅；只；不过' }
                    ]
                }, {
                    name: 'Unit 10 Memories',
                    words: [
                        { en: 'yard', zh: '院子' },
                        { en: 'sweet', zh: '甜蜜的；甜的；含糖的' },
                        { en: 'memory', zh: '记忆；回忆' },
                        { en: 'cent', zh: '分；分币' },
                        { en: 'toy', zh: '玩具' },
                        { en: 'hometown', zh: '家乡；故乡' },
                        { en: 'consider', zh: '注视；仔细考虑' },
                        { en: 'among', zh: '在…之中' },
                        { en: 'opposite', zh: '与…相对；在…对面；对面的' },
                        { en: 'especially', zh: '尤其；特别' }
                    ]
                }]
            },

            // ===================== 九年级全一册 =====================
            '九年级全一册': {
                units: [{
                    name: 'Unit 1 Learning Strategies',
                    words: [
                        { en: 'textbook', zh: '教科书；课本' },
                        { en: 'conversation', zh: '交谈；谈话' },
                        { en: 'pronunciation', zh: '发音；读音' },
                        { en: 'sentence', zh: '句子' },
                        { en: 'patient', zh: '有耐心的；病人' },
                        { en: 'increase', zh: '增加；增长' },
                        { en: 'ability', zh: '能力；才能' },
                        { en: 'create', zh: '创造；创建' },
                        { en: 'brain', zh: '大脑' },
                        { en: 'review', zh: '回顾；复习' }
                    ]
                }, {
                    name: 'Unit 2 Festivals',
                    words: [
                        { en: 'mooncake', zh: '月饼' },
                        { en: 'lantern', zh: '灯笼' },
                        { en: 'stranger', zh: '陌生人' },
                        { en: 'relative', zh: '亲属；亲戚' },
                        { en: 'pound', zh: '磅；英镑' },
                        { en: 'punish', zh: '处罚；惩罚' },
                        { en: 'warn', zh: '警告；告诫' },
                        { en: 'present', zh: '现在；礼物；现在的' },
                        { en: 'nobody', zh: '没有人' },
                        { en: 'spread', zh: '传播；展开；蔓延；传播' }
                    ]
                }, {
                    name: 'Unit 3 Public Places',
                    words: [
                        { en: 'restroom', zh: '洗手间；公共厕所' },
                        { en: 'stamp', zh: '邮票；印章' },
                        { en: 'beside', zh: '在…旁边；在…附近' },
                        { en: 'postcard', zh: '明信片' },
                        { en: 'pardon', zh: '请再说一遍；抱歉，对不起' },
                        { en: 'suggest', zh: '建议；提议' },
                        { en: 'address', zh: '地址；住址' },
                        { en: 'course', zh: '课程；学科' },
                        { en: 'request', zh: '要求；请求' },
                        { en: 'choice', zh: '选择；抉择' }
                    ]
                }, {
                    name: 'Unit 4 Changes',
                    words: [
                        { en: 'humorous', zh: '有幽默感的；滑稽有趣的' },
                        { en: 'silent', zh: '不说话的；沉默的' },
                        { en: 'score', zh: '得分；进球' },
                        { en: 'background', zh: '背景' },
                        { en: 'interview', zh: '采访；面试；访谈' },
                        { en: 'private', zh: '私人的；私密的' },
                        { en: 'require', zh: '需要；要求' },
                        { en: 'European', zh: '欧洲的；欧洲人的' },
                        { en: 'African', zh: '非洲的；非洲人的' },
                        { en: 'speech', zh: '讲话；发言' }
                    ]
                }, {
                    name: 'Unit 5 Materials',
                    words: [
                        { en: 'material', zh: '材料；原料' },
                        { en: 'cotton', zh: '棉花；棉织物' },
                        { en: 'produce', zh: '生产；制造；出产' },
                        { en: 'widely', zh: '广泛地；普通地' },
                        { en: 'process', zh: '加工；处理' },
                        { en: 'local', zh: '当地的；本地的' },
                        { en: 'avoid', zh: '避免；回避' },
                        { en: 'handbag', zh: '手提包' },
                        { en: 'everyday', zh: '日常的；每天的' },
                        { en: 'boss', zh: '老板；上司' }
                    ]
                }, {
                    name: 'Unit 6 Inventions',
                    words: [
                        { en: 'invent', zh: '发明；创造' },
                        { en: 'invention', zh: '发明；发明物' },
                        { en: 'create', zh: '创造；创建' },
                        { en: 'almost', zh: '几乎；差不多' },
                        { en: 'sudden', zh: '突然（的）' },
                        { en: 'nearly', zh: '几乎；差不多' },
                        { en: 'pioneer', zh: '先驱；先锋' },
                        { en: 'list', zh: '列表；清单；列清单' },
                        { en: 'mention', zh: '提到；说起' },
                        { en: 'website', zh: '网站' }
                    ]
                }, {
                    name: 'Unit 7 Rules',
                    words: [
                        { en: 'allow', zh: '允许；准许' },
                        { en: 'choose', zh: '选择' },
                        { en: 'manage', zh: '设法做成；管理' },
                        { en: 'society', zh: '社会' },
                        { en: 'educate', zh: '教育' },
                        { en: 'value', zh: '重视；珍视；价值' },
                        { en: 'support', zh: '支持' },
                        { en: 'enter', zh: '进来；进去' },
                        { en: 'chance', zh: '机会；可能性' },
                        { en: 'fail', zh: '失败；未能（做到）' }
                    ]
                }, {
                    name: 'Unit 8 Mysteries',
                    words: [
                        { en: 'whose', zh: '谁的' },
                        { en: 'belong', zh: '属于' },
                        { en: 'value', zh: '价值；有用性' },
                        { en: 'picnic', zh: '野餐' },
                        { en: 'noise', zh: '声音；噪音' },
                        { en: 'receive', zh: '收到；接到' },
                        { en: 'prevent', zh: '阻止；阻挠' },
                        { en: 'energy', zh: '力量；精力' },
                        { en: 'position', zh: '位置；地方' },
                        { en: 'burial', zh: '埋葬' }
                    ]
                }, {
                    name: 'Unit 9 Music & Movies',
                    words: [
                        { en: 'suppose', zh: '假定；推断' },
                        { en: 'smooth', zh: '平滑的；悦耳的' },
                        { en: 'spare', zh: '空闲的；不用的；抽出；留出' },
                        { en: 'case', zh: '情况；实情' },
                        { en: 'reflect', zh: '反映；映出' },
                        { en: 'perform', zh: '表演；执行' },
                        { en: 'pain', zh: '痛苦；疼痛；苦恼' },
                        { en: 'praise', zh: '表扬；赞扬' },
                        { en: 'recall', zh: '回忆起；回想起' }
                    ]
                }, {
                    name: 'Unit 10 Customs',
                    words: [
                        { en: 'custom', zh: '风俗；习俗' },
                        { en: 'bow', zh: '鞠躬' },
                        { en: 'kiss', zh: '亲吻；接吻' },
                        { en: 'relaxed', zh: '放松的；自在的' },
                        { en: 'value', zh: '重视；珍视' },
                        { en: 'manner', zh: '方式；方法；(pl.)礼貌；礼仪' },
                        { en: 'worth', zh: '值得；有…价值' },
                        { en: 'basic', zh: '基本的；基础的' },
                        { en: 'exchange', zh: '交换' },
                        { en: 'granddaughter', zh: '（外）孙女' }
                    ]
                }, {
                    name: 'Unit 11 Feelings',
                    words: [
                        { en: 'drive', zh: '迫使' },
                        { en: 'friendship', zh: '友谊；友情' },
                        { en: 'king', zh: '国王；君主' },
                        { en: 'power', zh: '力量；权力' },
                        { en: 'banker', zh: '银行家' },
                        { en: 'examine', zh: '检查；审查' },
                        { en: 'wealth', zh: '财富；富裕' },
                        { en: 'grey', zh: '（天空）阴沉的；灰色的' },
                        { en: 'palace', zh: '宫殿' },
                        { en: 'pale', zh: '苍白的；灰白的' }
                    ]
                }, {
                    name: 'Unit 12 Unexpected Moments',
                    words: [
                        { en: 'backpack', zh: '背包；旅行包' },
                        { en: 'oversleep', zh: '睡过头；睡得太久' },
                        { en: 'ring', zh: '鸣响；发出铃声' },
                        { en: 'go off', zh: '（闹钟）发出响声' },
                        { en: 'rush', zh: '冲；奔' },
                        { en: 'fool', zh: '蠢人；傻瓜；愚弄' },
                        { en: 'cancel', zh: '取消；终止' },
                        { en: 'officer', zh: '军官；官员' },
                        { en: 'believable', zh: '可相信的；可信任的' },
                        { en: 'disappear', zh: '消失；不见' }
                    ]
                }, {
                    name: 'Unit 13 Environment',
                    words: [
                        { en: 'litter', zh: '乱扔；垃圾；废弃物' },
                        { en: 'bottom', zh: '底部；最下部' },
                        { en: 'fisherman', zh: '渔民；钓鱼的人' },
                        { en: 'coal', zh: '煤；煤块' },
                        { en: 'ugly', zh: '丑陋的；难看的' },
                        { en: 'reusable', zh: '可重复使用的；可再次使用的' },
                        { en: 'afford', zh: '承担得起（后果）；买得起' },
                        { en: 'recycle', zh: '回收利用；再利用' },
                        { en: 'gate', zh: '大门' },
                        { en: 'metal', zh: '金属' }
                    ]
                }, {
                    name: 'Unit 14 Memories of School',
                    words: [
                        { en: 'survey', zh: '调查' },
                        { en: 'standard', zh: '标准；水平' },
                        { en: 'row', zh: '一排；一列；一行' },
                        { en: 'keyboard', zh: '键盘式电子乐器；键盘' },
                        { en: 'method', zh: '方法；办法' },
                        { en: 'overcome', zh: '克服；战胜' },
                        { en: 'thankful', zh: '感激的；感谢的' },
                        { en: 'separate', zh: '分开的；分离的' },
                        { en: 'wing', zh: '翅膀；翼' },
                        { en: 'task', zh: '任务；工作' }
                    ]
                }]
            }
        };
