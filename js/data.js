/**
 * ALICE ESL Phonics P1 - Mighty Fish 3D 海底探險題庫資料
 * 包含三大課程模組：Q&A 句型問答、動物能力與動作配對、Phonics 字首音辨識
 */

const P1_FISH_QUESTIONS = [
  // ==========================================
  // 模組一：Q&A 完整問答句型 (課本第 10 頁、第 26 頁)
  // 特色：必須使用英文語音朗讀完整問句！
  // ==========================================
  {
    id: "qa-fish-swim",
    type: "QA",
    source: "Student Book p.10 / Activity Book p.26",
    questionEn: "Can the fish swim?",
    questionZh: "魚會游泳嗎？",
    speechText: "Can the fish swim?",
    options: ["Yes, it can.", "No, it can't.", "Yes, it soar."],
    correct: "Yes, it can.",
    audioFallback: "P1_flashcards_audios/P1_swim.mp3",
    voiceType: "speech"
  },
  {
    id: "qa-rabbit-soar",
    type: "QA",
    source: "Activity Book p.26 #1",
    questionEn: "Can the rabbit soar?",
    questionZh: "兔子會翱翔嗎？",
    speechText: "Can the rabbit soar?",
    options: ["No, it can't.", "Yes, it can.", "No, it hop."],
    correct: "No, it can't.",
    audioFallback: "P1_flashcards_audios/P1_rabbit.mp3",
    voiceType: "speech"
  },
  {
    id: "qa-frog-jump",
    type: "QA",
    source: "Activity Book p.26 #3",
    questionEn: "Can the frog jump?",
    questionZh: "青蛙會跳躍嗎？",
    speechText: "Can the frog jump?",
    options: ["Yes, it can.", "No, it can't.", "Yes, it fly."],
    correct: "Yes, it can.",
    audioFallback: "P1_flashcards_audios/P1_jump.mp3",
    voiceType: "speech"
  },
  {
    id: "qa-rooster-climb",
    type: "QA",
    source: "Activity Book p.26 #2",
    questionEn: "Can the rooster climb?",
    questionZh: "公雞會爬樹嗎？",
    speechText: "Can the rooster climb?",
    options: ["No, it can't.", "Yes, it can.", "No, it run."],
    correct: "No, it can't.",
    audioFallback: "P1_flashcards_audios/P1_rooster.mp3",
    voiceType: "speech"
  },
  {
    id: "qa-horse-hop",
    type: "QA",
    source: "Activity Book p.26 #5",
    questionEn: "Can the horse hop?",
    questionZh: "馬會單腳跳嗎？",
    speechText: "Can the horse hop?",
    options: ["No, it can't.", "Yes, it can.", "Yes, it hop."],
    correct: "No, it can't.",
    audioFallback: "P1_flashcards_audios/P1_horse.mp3",
    voiceType: "speech"
  },
  {
    id: "qa-eagle-soar",
    type: "QA",
    source: "Activity Book p.26 #6",
    questionEn: "Can the eagle soar?",
    questionZh: "老鷹會高空翱翔嗎？",
    speechText: "Can the eagle soar?",
    options: ["Yes, it can.", "No, it can't.", "No, it swim."],
    correct: "Yes, it can.",
    audioFallback: "P1_flashcards_audios/P1_soar.mp3",
    voiceType: "speech"
  },
  {
    id: "qa-you-swim-fish",
    type: "QA",
    source: "Student Book p.10 Conversation #1",
    questionEn: "Can you swim like a fish?",
    questionZh: "你能像魚一樣游泳嗎？",
    speechText: "Can you swim like a fish?",
    options: ["Yes, I can.", "No, I can't.", "Yes, I fly."],
    correct: "Yes, I can.",
    audioFallback: "P1_flashcards_audios/P1_fish.mp3",
    voiceType: "speech"
  },
  {
    id: "qa-you-fly-owl",
    type: "QA",
    source: "Student Book p.10 Conversation #4",
    questionEn: "Can you fly like an owl?",
    questionZh: "你能像貓頭鷹一樣飛翔嗎？",
    speechText: "Can you fly like an owl?",
    options: ["No, I can't.", "Yes, I can.", "No, I walk."],
    correct: "No, I can't.",
    audioFallback: "P1_flashcards_audios/P1_fly.mp3",
    voiceType: "speech"
  },

  // ==========================================
  // 模組二：動物動作與能力配對 (課本第 06-07 頁、第 14 頁)
  // 特色：播放 P1 英語教材真人發音！
  // ==========================================
  {
    id: "action-fish",
    type: "ACTION",
    source: "Student Book p.06 #2",
    questionEn: "Kim has a fish. The fish can ___?",
    questionZh: "魚能做什麼動作？",
    speechText: "Kim has a fish. The fish can swim.",
    options: ["swim", "hop", "fly"],
    correct: "swim",
    audioFile: "P1_flashcards_audios/P1_swim.mp3",
    voiceType: "speech"
  },
  {
    id: "action-dog",
    type: "ACTION",
    source: "Student Book p.06 #1",
    questionEn: "Diego has a dog. The dog can ___?",
    questionZh: "小狗能做什麼動作？",
    speechText: "Diego has a dog. The dog can run.",
    options: ["run", "fly", "climb"],
    correct: "run",
    audioFile: "P1_flashcards_audios/P1_run.mp3",
    voiceType: "speech"
  },
  {
    id: "action-frog",
    type: "ACTION",
    source: "Student Book p.12 Short Story",
    questionEn: "Josh has a frog. The frog can ___?",
    questionZh: "青蛙能做什麼動作？",
    speechText: "Josh has a frog. The frog can jump.",
    options: ["jump", "soar", "sing"],
    correct: "jump",
    audioFile: "P1_flashcards_audios/P1_jump.mp3",
    voiceType: "speech"
  },
  {
    id: "action-rabbit",
    type: "ACTION",
    source: "Student Book p.06 #3",
    questionEn: "Ted has a rabbit. The rabbit can ___?",
    questionZh: "兔子能做什麼動作？",
    speechText: "Ted has a rabbit. The rabbit can hop.",
    options: ["hop", "swim", "fly"],
    correct: "hop",
    audioFile: "P1_flashcards_audios/P1_hop.mp3",
    voiceType: "speech"
  },
  {
    id: "action-duck",
    type: "ACTION",
    source: "Student Book p.06 #5",
    questionEn: "Zac has a duck. The duck can ___?",
    questionZh: "鴨子能做什麼動作？",
    speechText: "Zac has a duck. The duck can walk.",
    options: ["walk", "soar", "climb"],
    correct: "walk",
    audioFile: "P1_flashcards_audios/P1_walk.mp3",
    voiceType: "speech"
  },
  {
    id: "action-owl",
    type: "ACTION",
    source: "Student Book p.06 #4",
    questionEn: "Paul has an owl. The owl can ___?",
    questionZh: "貓頭鷹能做什麼動作？",
    speechText: "Paul has an owl. The owl can fly.",
    options: ["fly", "swim", "dance"],
    correct: "fly",
    audioFile: "P1_flashcards_audios/P1_fly.mp3",
    voiceType: "speech"
  },

  // ==========================================
  // 模組三：Phonics 字首音辨識 (課本第 04-05 頁、第 08-09 頁)
  // 特色：播放 P1 英語教材單字發音！
  // ==========================================
  {
    id: "phonics-f",
    type: "PHONICS",
    source: "Student Book p.04 Beginning Sounds Ff",
    questionEn: "Which word begins with Ff /f/?",
    questionZh: "哪一個單字是 Ff 發音開頭？",
    speechText: "Which word begins with Ff?",
    options: ["fish", "dog", "hat"],
    correct: "fish",
    audioFile: "P1_flashcards_audios/P1_fish.mp3",
    voiceType: "speech"
  },
  {
    id: "phonics-d",
    type: "PHONICS",
    source: "Student Book p.04 Beginning Sounds Dd",
    questionEn: "Which word begins with Dd /d/?",
    questionZh: "哪一個單字是 Dd 發音開頭？",
    speechText: "Which word begins with Dd?",
    options: ["dog", "sun", "jump"],
    correct: "dog",
    audioFile: "P1_flashcards_audios/P1_dog.mp3",
    voiceType: "speech"
  },
  {
    id: "phonics-r",
    type: "PHONICS",
    source: "Student Book p.08 Beginning Sounds Rr",
    questionEn: "Which word begins with Rr /r/?",
    questionZh: "哪一個單字是 Rr 發音開頭？",
    speechText: "Which word begins with Rr?",
    options: ["rabbit", "frog", "duck"],
    correct: "rabbit",
    audioFile: "P1_flashcards_audios/P1_rabbit.mp3",
    voiceType: "speech"
  },
  {
    id: "phonics-h",
    type: "PHONICS",
    source: "Student Book p.05 Beginning Sounds Hh",
    questionEn: "Which word begins with Hh /h/?",
    questionZh: "哪一個單字是 Hh 發音開頭？",
    speechText: "Which word begins with Hh?",
    options: ["horse", "fish", "kiss"],
    correct: "horse",
    audioFile: "P1_flashcards_audios/P1_horse.mp3",
    voiceType: "speech"
  },
  {
    id: "phonics-s",
    type: "PHONICS",
    source: "Student Book p.08 Beginning Sounds Ss",
    questionEn: "Which word begins with Ss /s/?",
    questionZh: "哪一個單字是 Ss 發音開頭？",
    speechText: "Which word begins with Ss?",
    options: ["sun", "kite", "dish"],
    correct: "sun",
    audioFile: "P1_flashcards_audios/P1_sun.mp3",
    voiceType: "speech"
  },
  {
    id: "phonics-j",
    type: "PHONICS",
    source: "Student Book p.09 Beginning Sounds Jj",
    questionEn: "Which word begins with Jj /dʒ/?",
    questionZh: "哪一個單字是 Jj 發音開頭？",
    speechText: "Which word begins with Jj?",
    options: ["juice", "foot", "red"],
    correct: "juice",
    audioFile: "P1_flashcards_audios/P1_juice.mp3",
    voiceType: "speech"
  },
  {
    id: "phonics-k",
    type: "PHONICS",
    source: "Student Book p.09 Beginning Sounds Kk",
    questionEn: "Which word begins with Kk /k/?",
    questionZh: "哪一個單字是 Kk 發音開頭？",
    speechText: "Which word begins with Kk?",
    options: ["kite", "face", "day"],
    correct: "kite",
    audioFile: "P1_flashcards_audios/P1_kite.mp3",
    voiceType: "speech"
  }
];

if (typeof window !== "undefined") {
  window.P1_FISH_QUESTIONS = P1_FISH_QUESTIONS;
  window.P1_QUESTIONS_DATA = P1_FISH_QUESTIONS;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { P1_FISH_QUESTIONS, P1_QUESTIONS_DATA: P1_FISH_QUESTIONS };
}
