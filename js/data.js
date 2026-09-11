/**
 * ALICE ESL Phonics P1 - 大魚吃小魚英文冒險題庫 (data.js)
 * 課本學習範圍：Page 04 - 07
 * 主題：Consonants (Ff, Dd, Hh, Rr, Ss, Jj, Kk) & Animal Actions
 */

window.BOOK_ID = "P1";
const FISH_QUESTIONS = [
  {
    "id": "fish-qa-1",
    "type": "QA",
    "source": "ALICE ESL Phonics P1 Page 04 - 07",
    "questionEn": "Can the fish swim?",
    "questionZh": "魚會游泳嗎？",
    "speechText": "Can the fish swim?",
    "options": [
      "Yes, it can.",
      "No, it can't.",
      "Yes, it soar."
    ],
    "correct": "Yes, it can.",
    "audioFallback": "P1_flashcards_audios/P1_swim.mp3",
    "theme": "Consonants (Ff, Dd, Hh, Rr, Ss, Jj, Kk) & Animal Actions"
  },
  {
    "id": "fish-qa-2",
    "type": "QA",
    "source": "ALICE ESL Phonics P1 Page 04 - 07",
    "questionEn": "Can the rabbit soar?",
    "questionZh": "兔子會高空翱翔嗎？",
    "speechText": "Can the rabbit soar?",
    "options": [
      "No, it can't.",
      "Yes, it can.",
      "No, it hop."
    ],
    "correct": "No, it can't.",
    "audioFallback": "P1_flashcards_audios/P1_rabbit.mp3",
    "theme": "Consonants (Ff, Dd, Hh, Rr, Ss, Jj, Kk) & Animal Actions"
  },
  {
    "id": "fish-qa-3",
    "type": "QA",
    "source": "ALICE ESL Phonics P1 Page 04 - 07",
    "questionEn": "Can the frog jump?",
    "questionZh": "青蛙會跳躍嗎？",
    "speechText": "Can the frog jump?",
    "options": [
      "Yes, it can.",
      "No, it can't.",
      "Yes, it fly."
    ],
    "correct": "Yes, it can.",
    "audioFallback": "P1_flashcards_audios/P1_jump.mp3",
    "theme": "Consonants (Ff, Dd, Hh, Rr, Ss, Jj, Kk) & Animal Actions"
  },
  {
    "id": "fish-qa-4",
    "type": "QA",
    "source": "ALICE ESL Phonics P1 Page 04 - 07",
    "questionEn": "Can the horse hop?",
    "questionZh": "馬會單腳跳嗎？",
    "speechText": "Can the horse hop?",
    "options": [
      "No, it can't.",
      "Yes, it can.",
      "Yes, it hop."
    ],
    "correct": "No, it can't.",
    "audioFallback": "P1_flashcards_audios/P1_horse.mp3",
    "theme": "Consonants (Ff, Dd, Hh, Rr, Ss, Jj, Kk) & Animal Actions"
  },
  {
    "id": "fish-qa-5",
    "type": "QA",
    "source": "ALICE ESL Phonics P1 Page 04 - 07",
    "questionEn": "Which word begins with Ff?",
    "questionZh": "哪一個單字是 Ff 開頭？",
    "speechText": "Which word begins with Ff?",
    "options": [
      "fish",
      "dog",
      "sun"
    ],
    "correct": "fish",
    "audioFallback": "P1_flashcards_audios/P1_fish.mp3",
    "theme": "Consonants (Ff, Dd, Hh, Rr, Ss, Jj, Kk) & Animal Actions"
  },
  {
    "id": "fish-qa-6",
    "type": "QA",
    "source": "ALICE ESL Phonics P1 Page 04 - 07",
    "questionEn": "Which word begins with Dd?",
    "questionZh": "哪一個單字是 Dd 開頭？",
    "speechText": "Which word begins with Dd?",
    "options": [
      "dog",
      "hat",
      "kite"
    ],
    "correct": "dog",
    "audioFallback": "P1_flashcards_audios/P1_dog.mp3",
    "theme": "Consonants (Ff, Dd, Hh, Rr, Ss, Jj, Kk) & Animal Actions"
  }
];

if (typeof window !== "undefined") {
  window.FISH_QUESTIONS = FISH_QUESTIONS;
}
