// ========================================
// 臺灣名產大挑戰
// 題庫來源：questions.csv
// ========================================

// 每輪測驗題目數量
const QUESTIONS_PER_ROUND = 5;

// CSV 題庫
let questionBank = [];

// 題庫載入狀態
let questionBankLoaded = false;
let questionBankError = "";

// 目前測驗題目
let currentQuestions = [];

// 上一輪完整作答紀錄
let lastRoundRecords = [];

// 目前題目索引
let currentQuestion = 0;

// 目前分數
let score = 0;

// 是否已經作答
let answered = false;

// 使用者目前選擇的答案
let selectedAnswer = -1;

// 是否顯示結果頁
let finished = false;

// 是否顯示回顧頁
let reviewing = false;

// 回顧清單捲動位置
let reviewScrollY = 0;

// 回顧清單最大捲動距離
let reviewMaxScroll = 0;

// 是否正在拖曳回顧清單
let reviewDragging = false;

// 上一次觸控或滑鼠垂直位置
let reviewLastPointerY = 0;

// 背景泡泡陣列
let bubbles = [];

// 答案選項配色
const optionColors = [
  "#FF8FAB",
  "#FFB703",
  "#8ECAE6",
  "#90BE6D"
];

// ========================================
// p5.js 預先載入 CSV 題庫
// ========================================

function preload() {
  loadTable(
    "questions.csv",
    "csv",
    "header",
    function (table) {
      loadQuestionBankFromTable(table);
    },
    function () {
      questionBankError =
        "無法載入 questions.csv，請確認檔案與 index.html 位於同一個資料夾。";
    }
  );
}

// 將 CSV 表格轉換成題庫資料
function loadQuestionBankFromTable(table) {
  questionBank = [];

  if (!table || table.getRowCount() === 0) {
    questionBankError = "questions.csv 目前沒有任何題目。";
    return;
  }

  for (let rowIndex = 0; rowIndex < table.getRowCount(); rowIndex++) {
    const row = table.getRow(rowIndex);

    const question = String(row.get("question") || "").trim();
    const option1 = String(row.get("option1") || "").trim();
    const option2 = String(row.get("option2") || "").trim();
    const option3 = String(row.get("option3") || "").trim();
    const option4 = String(row.get("option4") || "").trim();
    const answerText = String(row.get("answer") || "").trim();
    const explanation = String(row.get("explanation") || "").trim();

    const answer = Number(answerText) - 1;

    const isValidQuestion =
      question !== "" &&
      option1 !== "" &&
      option2 !== "" &&
      option3 !== "" &&
      option4 !== "" &&
      Number.isInteger(answer) &&
      answer >= 0 &&
      answer <= 3;

    if (!isValidQuestion) {
      continue;
    }

    questionBank.push({
      bankId: `csv-row-${rowIndex + 2}`,
      question: question,
      options: [option1, option2, option3, option4],
      answer: answer,
      explanation: explanation || "這是臺灣具代表性的特色名產。"
    });
  }

  if (questionBank.length === 0) {
    questionBankError =
      "questions.csv 沒有有效題目，請檢查欄位名稱與 answer 欄位。";
    return;
  }

  questionBankLoaded = true;
}

// ========================================
// p5.js 初始化
// ========================================

function setup() {
  createCanvas(windowWidth, windowHeight);

  textFont("Chiron GoRound TC");
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  pixelDensity(displayDensity());

  createBubbles();

  if (questionBankLoaded) {
    createNewRound([]);
  }
}

// ========================================
// p5.js 每一幀
// ========================================

function draw() {
  drawBackground();
  drawBubbles();

  if (questionBankError !== "") {
    drawDataErrorScreen();
    return;
  }

  if (!questionBankLoaded) {
    drawLoadingScreen();
    return;
  }

  if (reviewing) {
    drawReviewScreen();
  } else if (finished) {
    drawResultScreen();
  } else {
    drawQuizScreen();
  }
}

// ========================================
// 載入狀態畫面
// ========================================

function drawLoadingScreen() {
  fill("#6D597A");
  textStyle(BOLD);
  textSize(constrain(width * 0.07, 30, 58));
  text("題庫載入中…", width / 2, height / 2 - 35);

  fill("#5C677D");
  textStyle(NORMAL);
  textSize(constrain(width * 0.03, 16, 24));
  text("請稍候", width / 2, height / 2 + 30);
}

function drawDataErrorScreen() {
  const cardWidth = min(width * 0.88, 650);
  const cardHeight = min(height * 0.55, 360);
  const centerX = width / 2;
  const centerY = height / 2;

  fill(0, 0, 0, 25);
  rect(centerX + 5, centerY + 7, cardWidth, cardHeight, 28);

  fill("#FFFFFF");
  rect(centerX, centerY, cardWidth, cardHeight, 28);

  fill("#C44536");
  textStyle(BOLD);
  textSize(constrain(width * 0.06, 28, 48));
  text("題庫載入失敗", centerX, centerY - 85);

  fill("#5C677D");
  textStyle(NORMAL);
  textSize(constrain(width * 0.026, 14, 20));
  text(questionBankError, centerX, centerY - 10, cardWidth * 0.78, 100);

  fill("#FB8500");
  textSize(constrain(width * 0.022, 13, 17));
  text(
    "請確認 questions.csv 的檔名、位置與欄位格式。",
    centerX,
    centerY + 90,
    cardWidth * 0.8,
    50
  );
}

// ========================================
// 建立新一輪測驗
// ========================================

function createNewRound(previousQuestions) {
  if (questionBank.length === 0) {
    questionBankError = "目前沒有可用的題目。";
    return;
  }

  const shuffledBank = shuffleArray(questionBank.slice());

  const previousIds = new Set(
    previousQuestions.map((question) => question.bankId)
  );

  let availableQuestions = shuffledBank.filter((question) => {
    return !previousIds.has(question.bankId);
  });

  if (availableQuestions.length < QUESTIONS_PER_ROUND) {
    availableQuestions = shuffledBank;
  }

  const roundQuestionCount = min(
    QUESTIONS_PER_ROUND,
    availableQuestions.length
  );

  currentQuestions = availableQuestions
    .slice(0, roundQuestionCount)
    .map((question) => prepareQuestion(question));

  currentQuestion = 0;
  score = 0;
  answered = false;
  selectedAnswer = -1;
  finished = false;
  reviewing = false;
  reviewScrollY = 0;
}

// ========================================
// 準備單一題目
// ========================================

function prepareQuestion(question) {
  const indexedOptions = question.options.map((label, index) => {
    return {
      label: label,
      originalIndex: index
    };
  });

  const shuffledOptions = shuffleArray(indexedOptions);

  const newAnswerIndex = shuffledOptions.findIndex((option) => {
    return option.originalIndex === question.answer;
  });

  return {
    bankId: question.bankId,
    question: question.question,
    options: shuffledOptions.map((option) => option.label),
    answer: newAnswerIndex,
    explanation: question.explanation
  };
}

// ========================================
// 保存上一輪作答紀錄
// ========================================

function saveLastRound() {
  lastRoundRecords = currentQuestions.map((question) => {
    const userAnswer = question.userAnswer ?? -1;

    return {
      question: question.question,
      options: question.options.slice(),
      userAnswer: userAnswer,
      correctAnswer: question.answer,
      isCorrect: userAnswer === question.answer,
      explanation: question.explanation
    };
  });
}

// ========================================
// 洗牌函式
// ========================================

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const randomIndex = floor(random(i + 1));

    const temporaryValue = array[i];
    array[i] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// ========================================
// 背景泡泡
// ========================================

function createBubbles() {
  bubbles = [];

  for (let i = 0; i < 18; i++) {
    bubbles.push({
      x: random(width),
      y: random(height),
      size: random(25, 90),
      speed: random(0.2, 0.7),
      alpha: random(25, 70)
    });
  }
}

function drawBackground() {
  background("#FFF4D6");

  noFill();
  stroke("#FFD6A5");
  strokeWeight(2);

  ellipse(width * 0.08, height * 0.12, width * 0.16);
  ellipse(width * 0.92, height * 0.16, width * 0.2);
  ellipse(width * 0.12, height * 0.9, width * 0.22);
  ellipse(width * 0.9, height * 0.85, width * 0.18);

  noStroke();
}

function drawBubbles() {
  for (const bubble of bubbles) {
    fill(255, 255, 255, bubble.alpha);
    ellipse(bubble.x, bubble.y, bubble.size);

    bubble.y -= bubble.speed;

    if (bubble.y < -bubble.size) {
      bubble.y = height + bubble.size;
    }
  }
}

// ========================================
// 測驗畫面
// ========================================

function drawQuizScreen() {
  const quiz = currentQuestions[currentQuestion];

  if (!quiz) {
    return;
  }

  const contentWidth = min(width * 0.9, 760);
  const centerX = width / 2;
  const cardY = height / 2 + 25;
  const cardHeight = min(height * 0.78, 680);

  fill("#6D597A");
  textSize(constrain(width * 0.055, 25, 48));
  textStyle(BOLD);
  text("臺灣名產大挑戰！", centerX, height * 0.08);

  textSize(constrain(width * 0.025, 14, 21));
  textStyle(NORMAL);
  text("一起探索各縣市的美味特產吧！", centerX, height * 0.135);

  fill(0, 0, 0, 25);
  rect(centerX + 5, cardY + 7, contentWidth, cardHeight, 28);

  fill("#FFFFFF");
  rect(centerX, cardY, contentWidth, cardHeight, 28);

  fill("#FB8500");
  textSize(constrain(width * 0.03, 16, 24));
  textStyle(BOLD);
  text(
    `第 ${currentQuestion + 1} 題／共 ${currentQuestions.length} 題`,
    centerX,
    cardY - cardHeight * 0.39
  );

  fill("#FFE5B4");
  rect(centerX, cardY - cardHeight * 0.31, contentWidth * 0.75, 13, 8);

  fill("#FF8FAB");

  const progressWidth =
    (contentWidth * 0.75 * (currentQuestion + 1)) /
    currentQuestions.length;

  rect(
    centerX - contentWidth * 0.375 + progressWidth / 2,
    cardY - cardHeight * 0.31,
    progressWidth,
    13,
    8
  );

  fill("#3D405B");
  textSize(constrain(width * 0.037, 19, 30));
  textStyle(BOLD);
  text(quiz.question, centerX, cardY - cardHeight * 0.18, contentWidth * 0.82, 90);

  const optionWidth = min(contentWidth * 0.78, 530);
  const optionHeight = constrain(height * 0.065, 44, 58);
  const optionGap = 10;
  const firstOptionY = cardY - cardHeight * 0.035;

  for (let i = 0; i < quiz.options.length; i++) {
    const optionY = firstOptionY + i * (optionHeight + optionGap);

    drawOption(
      quiz.options[i],
      i,
      centerX,
      optionY,
      optionWidth,
      optionHeight
    );
  }

  if (answered) {
    drawAnswerFeedback(quiz, centerX, cardY, contentWidth, cardHeight);
    drawNextButton();
  }
}

// ========================================
// 答案選項
// ========================================

function drawOption(label, index, x, y, optionWidth, optionHeight) {
  let backgroundColor = optionColors[index];

  if (answered) {
    const correctAnswer = currentQuestions[currentQuestion].answer;

    if (index === correctAnswer) {
      backgroundColor = "#70C1B3";
    }

    if (index === selectedAnswer && index !== correctAnswer) {
      backgroundColor = "#F28482";
    }
  }

  fill(0, 0, 0, 18);
  rect(x + 3, y + 4, optionWidth, optionHeight, 16);

  fill(backgroundColor);
  rect(x, y, optionWidth, optionHeight, 16);

  fill("#FFFFFF");
  textSize(constrain(width * 0.027, 16, 22));
  textStyle(BOLD);
  text(`${String.fromCharCode(65 + index)}. ${label}`, x, y);
}

// ========================================
// 答案回饋
// ========================================

function drawAnswerFeedback(
  quiz,
  centerX,
  cardY,
  contentWidth,
  cardHeight
) {
  const isCorrect = selectedAnswer === quiz.answer;

  const feedbackHeight = constrain(height * 0.13, 82, 112);
  const feedbackY = cardY + cardHeight * 0.335;

  fill(isCorrect ? "#E1F7E7" : "#FFE4E1");
  rect(centerX, feedbackY, contentWidth * 0.78, feedbackHeight, 18);

  fill(isCorrect ? "#25855A" : "#C44536");
  textSize(constrain(width * 0.025, 14, 19));
  textStyle(BOLD);

  text(
    isCorrect ? "答對了！太棒啦！" : "答錯了，再接再厲！",
    centerX,
    feedbackY - feedbackHeight * 0.2
  );

  fill("#5C677D");
  textSize(constrain(width * 0.019, 12, 15));
  textStyle(NORMAL);

  text(
    quiz.explanation,
    centerX,
    feedbackY + feedbackHeight * 0.22,
    contentWidth * 0.7,
    42
  );
}

// ========================================
// 下一題按鈕
// ========================================

function drawNextButton() {
  const buttonWidth = min(width * 0.28, 180);
  const buttonHeight = 52;
  const buttonX = width - buttonWidth / 2 - 25;
  const buttonY = height - buttonHeight / 2 - 25;

  fill(0, 0, 0, 25);
  rect(buttonX + 3, buttonY + 4, buttonWidth, buttonHeight, 16);

  fill("#FF8FAB");
  rect(buttonX, buttonY, buttonWidth, buttonHeight, 16);

  fill("#FFFFFF");
  textSize(constrain(width * 0.025, 15, 20));
  textStyle(BOLD);

  text(
    currentQuestion === currentQuestions.length - 1
      ? "看結果！"
      : "下一題 ➜",
    buttonX,
    buttonY
  );
}

// ========================================
// 結果頁
// ========================================

function drawResultScreen() {
  const cardWidth = min(width * 0.88, 620);
  const cardHeight = min(height * 0.78, 600);
  const centerX = width / 2;
  const centerY = height / 2;

  fill(0, 0, 0, 25);
  rect(centerX + 5, centerY + 7, cardWidth, cardHeight, 30);

  fill("#FFFFFF");
  rect(centerX, centerY, cardWidth, cardHeight, 30);

  fill("#FB8500");
  textSize(constrain(width * 0.07, 32, 58));
  textStyle(BOLD);
  text("測驗完成！🎉", centerX, centerY - cardHeight * 0.3);

  fill("#6D597A");
  textSize(constrain(width * 0.11, 55, 90));
  text(`${score}／${currentQuestions.length}`, centerX, centerY - cardHeight * 0.08);

  fill("#5C677D");
  textSize(constrain(width * 0.03, 16, 24));

  const message =
    score === currentQuestions.length
      ? "太厲害了！你是名產小達人！"
      : score >= 3
      ? "表現很棒！再挑戰一次吧！"
      : "繼續加油，認識更多臺灣名產吧！";

  text(message, centerX, centerY + cardHeight * 0.08);

  drawResultButton(
    "回顧題目",
    centerX,
    centerY + cardHeight * 0.23,
    "#8ECAE6"
  );

  drawResultButton(
    "再作答一次",
    centerX,
    centerY + cardHeight * 0.38,
    "#FF8FAB"
  );
}

function drawResultButton(label, x, y, color) {
  const buttonWidth = min(width * 0.62, 330);
  const buttonHeight = 56;

  fill(0, 0, 0, 22);
  rect(x + 3, y + 4, buttonWidth, buttonHeight, 17);

  fill(color);
  rect(x, y, buttonWidth, buttonHeight, 17);

  fill("#FFFFFF");
  textSize(constrain(width * 0.03, 17, 23));
  textStyle(BOLD);
  text(label, x, y);
}

// ========================================
// 回顧頁
// ========================================

function drawReviewScreen() {
  const contentWidth = min(width * 0.92, 760);
  const cardHeight = height * 0.78;
  const cardY = height / 2 + 25;

  fill("#6D597A");
  textSize(constrain(width * 0.055, 25, 48));
  textStyle(BOLD);
  text("答題回顧 📋", width / 2, height * 0.08);

  fill("#5C677D");
  textSize(constrain(width * 0.025, 14, 20));
  textStyle(NORMAL);
  text("看看這一輪的答題結果與正確答案", width / 2, height * 0.135);

  fill(0, 0, 0, 25);
  rect(width / 2 + 5, cardY + 7, contentWidth, cardHeight, 28);

  fill("#FFFFFF");
  rect(width / 2, cardY, contentWidth, cardHeight, 28);

  const listTop = cardY - cardHeight / 2 + 24;
  const listBottom = cardY + cardHeight / 2 - 88;

  push();

  drawingContext.save();
  drawingContext.beginPath();

  drawingContext.rect(
    width / 2 - contentWidth / 2 + 10,
    listTop,
    contentWidth - 20,
    listBottom - listTop
  );

  drawingContext.clip();

  const contentStartY = listTop + reviewScrollY;

  lastRoundRecords.forEach((record, index) => {
    const itemY = contentStartY + index * 180;

    drawReviewItem(
      record,
      index,
      width / 2,
      itemY,
      contentWidth - 44
    );
  });

  drawingContext.restore();
  pop();

  const contentHeight = lastRoundRecords.length * 180 + 20;

  reviewMaxScroll = max(
    0,
    contentHeight - (listBottom - listTop)
  );

  drawBackToResultButton();
}

function drawReviewItem(record, index, centerX, y, itemWidth) {
  const itemHeight = 160;

  fill(record.isCorrect ? "#F0FBF6" : "#FFF2F0");
  rect(centerX, y + itemHeight / 2, itemWidth, itemHeight, 18);

  fill(record.isCorrect ? "#25855A" : "#C44536");
  textSize(constrain(width * 0.024, 14, 19));
  textStyle(BOLD);

  text(
    `第 ${index + 1} 題　${record.isCorrect ? "答對 ✓" : "答錯 ✗"}`,
    centerX,
    y + 22
  );

  fill("#3D405B");
  textSize(constrain(width * 0.021, 12, 17));
  textStyle(BOLD);

  text(
    record.question,
    centerX,
    y + 52,
    itemWidth * 0.86,
    36
  );

  const userAnswerText =
    record.userAnswer >= 0
      ? `${String.fromCharCode(65 + record.userAnswer)}. ${
          record.options[record.userAnswer]
        }`
      : "未作答";

  const correctAnswerText =
    `${String.fromCharCode(65 + record.correctAnswer)}. ` +
    `${record.options[record.correctAnswer]}`;

  fill("#5C677D");
  textSize(constrain(width * 0.019, 11, 15));
  textStyle(NORMAL);

  text(
    `你的答案：${userAnswerText}`,
    centerX,
    y + 94,
    itemWidth * 0.86,
    24
  );

  text(
    `正確答案：${correctAnswerText}`,
    centerX,
    y + 122,
    itemWidth * 0.86,
    24
  );
}

function drawBackToResultButton() {
  const buttonWidth = min(width * 0.62, 330);
  const buttonHeight = 52;
  const buttonX = width / 2;
  const buttonY = height - buttonHeight / 2 - 25;

  fill(0, 0, 0, 22);
  rect(buttonX + 3, buttonY + 4, buttonWidth, buttonHeight, 16);

  fill("#8ECAE6");
  rect(buttonX, buttonY, buttonWidth, buttonHeight, 16);

  fill("#FFFFFF");
  textSize(constrain(width * 0.027, 16, 21));
  textStyle(BOLD);
  text("回到結果", buttonX, buttonY);
}

// ========================================
// 滑鼠互動
// ========================================

function mousePressed() {
  if (mouseButton !== LEFT) {
    return;
  }

  if (reviewing) {
    handleReviewClick();

    reviewLastPointerY = mouseY;
    reviewDragging = true;
    return;
  }

  if (finished) {
    handleResultClick();
    return;
  }

  if (!answered) {
    handleOptionClick();
    return;
  }

  handleNextClick();
}

function mouseReleased() {
  reviewDragging = false;
}

function mouseDragged() {
  if (!reviewing || !reviewDragging) {
    return false;
  }

  const deltaY = mouseY - reviewLastPointerY;

  reviewScrollY = constrain(
    reviewScrollY + deltaY,
    -reviewMaxScroll,
    0
  );

  reviewLastPointerY = mouseY;

  return false;
}

function mouseWheel(event) {
  if (!reviewing) {
    return;
  }

  reviewScrollY = constrain(
    reviewScrollY - event.delta,
    -reviewMaxScroll,
    0
  );

  return false;
}

// ========================================
// 觸控互動
// ========================================

function touchStarted() {
  if (reviewing && touches.length > 0) {
    reviewLastPointerY = touches[0].y;
    reviewDragging = true;
  }

  return false;
}

function touchMoved() {
  if (!reviewing || !reviewDragging || touches.length === 0) {
    return false;
  }

  const currentTouchY = touches[0].y;
  const deltaY = currentTouchY - reviewLastPointerY;

  reviewScrollY = constrain(
    reviewScrollY + deltaY,
    -reviewMaxScroll,
    0
  );

  reviewLastPointerY = currentTouchY;

  return false;
}

function touchEnded() {
  reviewDragging = false;
  return false;
}

// ========================================
// 處理答案選項點擊
// ========================================

function handleOptionClick() {
  const quiz = currentQuestions[currentQuestion];

  if (!quiz) {
    return;
  }

  const contentWidth = min(width * 0.9, 760);
  const centerX = width / 2;
  const cardY = height / 2 + 25;
  const cardHeight = min(height * 0.78, 680);

  const optionWidth = min(contentWidth * 0.78, 530);
  const optionHeight = constrain(height * 0.065, 44, 58);
  const optionGap = 10;
  const firstOptionY = cardY - cardHeight * 0.035;

  for (let i = 0; i < quiz.options.length; i++) {
    const optionY = firstOptionY + i * (optionHeight + optionGap);

    if (
      isInsideRect(
        mouseX,
        mouseY,
        centerX,
        optionY,
        optionWidth,
        optionHeight
      )
    ) {
      selectedAnswer = i;
      quiz.userAnswer = i;
      answered = true;

      if (selectedAnswer === quiz.answer) {
        score++;
      }

      break;
    }
  }
}

// ========================================
// 處理下一題
// ========================================

function handleNextClick() {
  const buttonWidth = min(width * 0.28, 180);
  const buttonHeight = 52;
  const buttonX = width - buttonWidth / 2 - 25;
  const buttonY = height - buttonHeight / 2 - 25;

  if (
    !isInsideRect(
      mouseX,
      mouseY,
      buttonX,
      buttonY,
      buttonWidth,
      buttonHeight
    )
  ) {
    return;
  }

  if (currentQuestion === currentQuestions.length - 1) {
    saveLastRound();
    finished = true;
    return;
  }

  currentQuestion++;
  answered = false;
  selectedAnswer = -1;
}

// ========================================
// 處理結果頁按鈕
// ========================================

function handleResultClick() {
  const cardHeight = min(height * 0.78, 600);
  const centerX = width / 2;
  const centerY = height / 2;

  const buttonWidth = min(width * 0.62, 330);
  const buttonHeight = 56;

  const reviewY = centerY + cardHeight * 0.23;
  const retryY = centerY + cardHeight * 0.38;

  if (
    isInsideRect(
      mouseX,
      mouseY,
      centerX,
      reviewY,
      buttonWidth,
      buttonHeight
    )
  ) {
    if (lastRoundRecords.length > 0) {
      reviewing = true;
      reviewScrollY = 0;
    }

    return;
  }

  if (
    isInsideRect(
      mouseX,
      mouseY,
      centerX,
      retryY,
      buttonWidth,
      buttonHeight
    )
  ) {
    const previousQuestions = currentQuestions.slice();
    createNewRound(previousQuestions);
  }
}

// ========================================
// 處理回顧頁按鈕
// ========================================

function handleReviewClick() {
  const buttonWidth = min(width * 0.62, 330);
  const buttonHeight = 52;
  const buttonX = width / 2;
  const buttonY = height - buttonHeight / 2 - 25;

  if (
    isInsideRect(
      mouseX,
      mouseY,
      buttonX,
      buttonY,
      buttonWidth,
      buttonHeight
    )
  ) {
    reviewing = false;
    reviewScrollY = 0;
  }
}

// ========================================
// 判斷點擊是否位於矩形內
// ========================================

function isInsideRect(
  pointX,
  pointY,
  centerX,
  centerY,
  rectWidth,
  rectHeight
) {
  return (
    pointX >= centerX - rectWidth / 2 &&
    pointX <= centerX + rectWidth / 2 &&
    pointY >= centerY - rectHeight / 2 &&
    pointY <= centerY + rectHeight / 2
  );
}

// ========================================
// 視窗尺寸改變
// ========================================

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createBubbles();
}