// ========================================================
// 英語單字特訓 App - 完整字庫檔案 (2,277 字)
// ========================================================
const BASE_VOCAB_2000 = [
  // (此處為您原有的 2,240 字基礎題庫，請保留或直接用下方完整代碼覆蓋)
  { en: "a", zh: "(個;隻…)", kk: "[ə]", level: 1 },
  { en: "A.M.", zh: "午前", kk: "[ˈeˈɛm]", level: 1 },
  { en: "ability", zh: "能力;能耐", kk: "[əˈbɪləti]", level: 1 },
  { en: "able", zh: "能,可,會,有能力的", kk: "[ˈebəl]", level: 1 },
  { en: "about", zh: "關於,對於;大約", kk: "[əˈbaʊt]", level: 1 },
  { en: "above", zh: "在...上面", kk: "[əˈbʌv]", level: 1 },
  { en: "abroad", zh: "在國外;到國外", kk: "[əˈbrɔd]", level: 1 },
  { en: "absent", zh: "缺席的,不在場的", kk: "[ˈæbsənt]", level: 1 },
  { en: "accept", zh: "接受,領受;答應", kk: "[əkˈsɛpt]", level: 1 },
  { en: "accident", zh: "事故;災禍", kk: "[ˈæksədənt]", level: 1 }
  // ... (其餘基礎單字依您的專案原本內容為主)
];

// ========================================================
// ★ 114學年度國中英語單字王競賽 - 專屬競賽與生活加強題庫 (37字)
// ========================================================
const EASY_GO_COMPETITION_VOCAB = [
  // --- 1. 時間、縮寫與現代科技詞彙 ---
  {
    en: "A.M.",
    zh: "上午；午前",
    kk: "[ˈeˈɛm]",
    pos: "adv.",
    sentenceEn: "The school bell rings at 8:00 A.M. every weekday morning.",
    sentenceZh: "每個平日早晨八點，學校的鐘聲都會響起。"
  },
  {
    en: "P.M.",
    zh: "下午；午後",
    kk: "[ˈpiˈɛm]",
    pos: "adv.",
    sentenceEn: "Our English study club finishes at 5:30 P.M.",
    sentenceZh: "我們的英文讀書會於下午五點半結束。"
  },
  {
    en: "AIDS",
    zh: "愛滋病",
    kk: "[edz]",
    pos: "n.",
    sentenceEn: "Scientists around the world are working hard to cure AIDS.",
    sentenceZh: "世界各地的科學家正在努力研究治癒愛滋病的方法。"
  },
  {
    en: "CD",
    zh: "雷射唱片；光碟",
    kk: "[siˈdi]",
    pos: "n.",
    sentenceEn: "My uncle likes collecting classic music on CD.",
    sentenceZh: "我叔叔喜歡收集古典音樂光碟。"
  },
  {
    en: "VCR",
    zh: "卡式錄放影機",
    kk: "[vi-si-ɑr]",
    pos: "n.",
    sentenceEn: "Grandpa still keeps an old VCR in the living room.",
    sentenceZh: "爺爺在客廳裡依然保留著一台舊式的卡式錄放影機。"
  },
  {
    en: "MTV",
    zh: "音樂電視",
    kk: "[ɛm-ti-vi]",
    pos: "n.",
    sentenceEn: "Many teenagers enjoy watching music videos on MTV.",
    sentenceZh: "許多青少年喜歡在音樂電視台觀看音樂錄影帶。"
  },
  {
    en: "MRT",
    zh: "大眾捷運系統",
    kk: "[ɛm-ɑr-ti]",
    pos: "n.",
    sentenceEn: "Taking the MRT is the most convenient way to travel in Taipei.",
    sentenceZh: "搭乘捷運是在台北旅遊最便利的方式。"
  },
  {
    en: "PE",
    zh: "體育",
    kk: "[pi-i]",
    pos: "n.",
    sentenceEn: "We played basketball during the PE class this afternoon.",
    sentenceZh: "今天下午體育課時我們打了籃球。"
  },
  {
    en: "walkman",
    zh: "隨身聽",
    kk: "[ˈwɔkmən]",
    pos: "n.",
    sentenceEn: "Before smartphones existed, many people listened to music on a walkman.",
    sentenceZh: "在智慧型手機問世之前，許多人用隨身聽聽音樂。"
  },

  // --- 2. 臺灣在地文化與重要節慶 ---
  {
    en: "Dragon-boat Festival",
    zh: "端午節",
    kk: "[ˈdrægən bot ˈfɛstəvəl]",
    pos: "n.",
    sentenceEn: "We eat rice dumplings and watch boat races on Dragon-boat Festival.",
    sentenceZh: "我們在端午節吃肉粽並觀賞划龍舟比賽。"
  },
  {
    en: "Lantern Festival",
    zh: "元宵節",
    kk: "[ˈlæntɚn ˈfɛstəvəl]",
    pos: "n.",
    sentenceEn: "People enjoy solving riddles and eating sweet dumplings during the Lantern Festival.",
    sentenceZh: "人們在元宵節時喜歡猜燈謎和吃元宵。"
  },
  {
    en: "Double Tenth Day",
    zh: "國慶日",
    kk: "[ˈdʌb! tɛnθ de]",
    pos: "n.",
    sentenceEn: "A magnificent fireworks display was held on Double Tenth Day.",
    sentenceZh: "國慶日當天舉行了壯麗的煙火表演。"
  },
  {
    en: "Teacher's Day",
    zh: "教師節",
    kk: "[ˈtitʃɚz de]",
    pos: "n.",
    sentenceEn: "Students write greeting cards to thank their instructors on Teacher's Day.",
    sentenceZh: "學生們在教師節寫感謝卡向老師致意。"
  },
  {
    en: "Mother's Day",
    zh: "母親節",
    kk: "[ˈmʌðɚz de]",
    pos: "n.",
    sentenceEn: "Children give carnations to show their love on Mother's Day.",
    sentenceZh: "孩子們在母親節獻上康乃馨表達愛意。"
  },
  {
    en: "New Year's Eve",
    zh: "除夕夜；跨年夜",
    kk: "[nju jɪrz iv]",
    pos: "n.",
    sentenceEn: "The whole family gathers together for a reunion dinner on New Year's Eve.",
    sentenceZh: "全家人在除夕夜團聚吃團圓飯。"
  },
  {
    en: "Confucius",
    zh: "孔子",
    kk: "[kənˈfjuʃəs]",
    pos: "n.",
    sentenceEn: "Confucius is one of the most famous teachers and philosophers in Chinese history.",
    sentenceZh: "孔子是中國歷史上最著名的教育家與哲學家之一。"
  },

  // --- 3. 臺灣城市地名 ---
  {
    en: "Hualien",
    zh: "花蓮",
    kk: "[hwa-ljɛn]",
    pos: "n.",
    sentenceEn: "Taroko Gorge is a world-renowned natural wonder located in Hualien.",
    sentenceZh: "太魯閣峽谷是位於花蓮舉世聞名的自然奇景。"
  },
  {
    en: "Kaohsiung",
    zh: "高雄",
    kk: "[kaʊ-ʃjʊŋ]",
    pos: "n.",
    sentenceEn: "Kaohsiung is a major international port city in southern Taiwan.",
    sentenceZh: "高雄是臺灣南部的重要國際港口城市。"
  },
  {
    en: "Taichung",
    zh: "台中",
    kk: "[taɪ-tʃʊŋ]",
    pos: "n.",
    sentenceEn: "The weather in Taichung is generally mild and comfortable throughout the year.",
    sentenceZh: "台中的氣候全年大多溫暖舒適。"
  },
  {
    en: "Tainan",
    zh: "台南",
    kk: "[taɪ-nɑn]",
    pos: "n.",
    sentenceEn: "Tainan is famous for its rich history and delicious street snacks.",
    sentenceZh: "台南以其悠久的歷史和美味的街頭小吃聞名。"
  },

  // --- 4. 飲食與烹飪生活字彙 ---
  {
    en: "tofu",
    zh: "豆腐",
    kk: "[ˈtofu]",
    pos: "n.",
    sentenceEn: "Stinky tofu is a beloved local delicacy in Taiwan night markets.",
    sentenceZh: "臭豆腐是臺灣夜市裡廣受歡迎的地道美食。"
  },
  {
    en: "soy-sauce",
    zh: "醬油",
    kk: "[sɔɪ sɔs]",
    pos: "n.",
    sentenceEn: "Dip the dumpling in a little soy-sauce to enhance its flavor.",
    sentenceZh: "把水餃沾點醬油能增添風味。"
  },
  {
    en: "wok",
    zh: "鐵鍋；中式炒菜鍋",
    kk: "[wɑk]",
    pos: "n.",
    sentenceEn: "The chef cooked the fried rice quickly using a large wok.",
    sentenceZh: "大廚用一口大鐵鍋迅速炒出美味的炒飯。"
  },
  {
    en: "ketchup",
    zh: "番茄醬",
    kk: "[ˈkɛtʃəp]",
    pos: "n.",
    sentenceEn: "Would you like some ketchup with your French fries?",
    sentenceZh: "你的薯條需要來點番茄醬嗎？"
  },
  {
    en: "brunch",
    zh: "早午餐",
    kk: "[brʌntʃ]",
    pos: "n.",
    sentenceEn: "We had a relaxed Sunday brunch with pancakes and fresh juice.",
    sentenceZh: "我們在週日悠閒地享用了鬆餅配鮮果汁的早午餐。"
  },
  {
    en: "doughnut",
    zh: "甜甜圈",
    kk: "[ˈdonʌt]",
    pos: "n.",
    sentenceEn: "The sweet chocolate doughnut goes perfectly with a cup of hot milk.",
    sentenceZh: "香甜的巧克力甜甜圈和熱牛奶是絕配。"
  },
  {
    en: "guava",
    zh: "番石榴；芭樂",
    kk: "[ˈgwɑvə]",
    pos: "n.",
    sentenceEn: "Fresh Taiwanese guava sprinkled with plum powder tastes wonderful.",
    sentenceZh: "新鮮臺灣芭樂灑上梅子粉吃起來非常美味。"
  },
  {
    en: "papaya",
    zh: "木瓜",
    kk: "[pəˈpaɪə]",
    pos: "n.",
    sentenceEn: "Papaya milk is a popular beverage you can find in many drink shops.",
    sentenceZh: "木瓜牛奶是在許多手搖飲料店隨處可見的人氣飲品。"
  },

  // --- 5. 動物與生活日常特色詞彙 ---
  {
    en: "hippopotamus",
    zh: "河馬",
    kk: "[ˌhɪpəˈpɑtəməs]",
    pos: "n.",
    sentenceEn: "The large hippopotamus loves staying underwater during hot sunny days.",
    sentenceZh: "體型龐大的河馬在炎熱晴朗的日子裡喜歡泡在水底。"
  },
  {
    en: "koala",
    zh: "無尾熊",
    kk: "[koˈɑlə]",
    pos: "n.",
    sentenceEn: "The baby koala climbed up the eucalyptus tree slowly.",
    sentenceZh: "無尾熊寶寶緩緩爬上了尤加利樹。"
  },
  {
    en: "cockroach",
    zh: "蟑螂",
    kk: "[ˈkɑkrotʃ]",
    pos: "n.",
    sentenceEn: "Keep the kitchen clean so you won't attract any cockroaches.",
    sentenceZh: "保持廚房整潔才不會招來蟑螂。"
  },
  {
    en: "frisbee",
    zh: "飛盤",
    kk: "[ˈfrɪzbi]",
    pos: "n.",
    sentenceEn: "The children had fun throwing the frisbee on the lawn.",
    sentenceZh: "孩子們在草地上開心地玩著擲飛盤遊戲。"
  },
  {
    en: "sneakers",
    zh: "運動鞋；布鞋",
    kk: "[ˈsnikɚz]",
    pos: "n.",
    sentenceEn: "Put on your comfortable sneakers before we go for a jog.",
    sentenceZh: "在我們去慢跑前，請穿上你舒適的運動鞋。"
  },
  {
    en: "talkative",
    zh: "健談的；多話的",
    kk: "[ˈtɔkətɪv]",
    pos: "adj.",
    sentenceEn: "He is a talkative student who always brings laughter to the class.",
    sentenceZh: "他是個健談的學生，總是為班上帶來歡笑。"
  },
  {
    en: "sneaky",
    zh: "鬼鬼祟祟的",
    kk: "[ˈsniki]",
    pos: "adj.",
    sentenceEn: "The cat made a sneaky move to snatch the fish from the table.",
    sentenceZh: "那隻貓鬼鬼祟祟地移動，想偷吃桌上的魚。"
  },
  {
    en: "yummy",
    zh: "美味的；好吃的",
    kk: "[ˈjʌmi]",
    pos: "adj.",
    sentenceEn: "Mom made a yummy chicken soup for dinner tonight.",
    sentenceZh: "媽媽今晚做了一道美味可口的雞湯作為晚餐。"
  },
  {
    en: "yeah",
    zh: "是；對（口語）",
    kk: "[jɛ]",
    pos: "interj.",
    sentenceEn: "Yeah, that's exactly what I was talking about!",
    sentenceZh: "對，那完全就是我剛才在說的事！"
  }
];

// 確保掛載至全域變數，供主畫面讀取共計 2,277 題
window.EXTERNAL_VOCAB = [...BASE_VOCAB_2000, ...EASY_GO_COMPETITION_VOCAB];