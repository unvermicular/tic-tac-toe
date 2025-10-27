document.addEventListener("DOMContentLoaded", () => {
  const storageKeys = {
    theme: "ttt-theme",
    difficulty: "ttt-difficulty",
    symbol: "ttt-symbol",
  };

  const safeStorage = {
    get(key, fallback) {
      try {
        const stored = localStorage.getItem(key);
        return stored !== null ? stored : fallback;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        // Ignore storage errors (private browsing, etc.)
      }
    },
  };

  let board = Array(9).fill("");
  let currentPlayer = "X";
  let gameActive = true;
  let playerSymbol = safeStorage.get(storageKeys.symbol, "X");
  let aiSymbol = playerSymbol === "X" ? "O" : "X";
  let playerScore = 0;
  let aiScore = 0;
  let moveHistory = [];
  let gameHistory = [];
  let aiDifficulty = safeStorage.get(storageKeys.difficulty, "easy");

  const cells = document.querySelectorAll(".cell");
  const statusDisplay = document.getElementById("status");
  const turnIndicator = document.getElementById("turn-indicator");
  const playerScoreDisplay = document.getElementById("player-score");
  const aiScoreDisplay = document.getElementById("ai-score");
  const scoreBoxes = document.querySelectorAll(".score-box");
  const historyContainer = document.getElementById("history-container");
  const historyList = document.getElementById("history-list");
  const historyButton = document.getElementById("history-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const settingsButton = document.getElementById("settings-btn");
  const overlay = document.getElementById("overlay");

  const themeButtons = document.querySelectorAll(".theme-btn");
  const difficultyButtons = document.querySelectorAll(".difficulty-btn");
  const symbolButtons = document.querySelectorAll(".symbol-btn");

  const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  initGame();

  function initGame() {
    cells.forEach((cell) => {
      const index = Number(cell.getAttribute("data-index"));
      cell.addEventListener("click", () => handleCellClick(cell));
      cell.textContent = "";
      cell.classList.remove("x", "o", "winner");
      cell.setAttribute("aria-label", `Empty cell ${index + 1}`);
    });

    document.getElementById("undo-btn").addEventListener("click", undoMove);
    document
      .getElementById("reset-round-btn")
      .addEventListener("click", () => resetRound());
    document
      .getElementById("reset-scores-btn")
      .addEventListener("click", resetScores);
    historyButton.addEventListener("click", toggleHistory);
    settingsButton.addEventListener("click", () => toggleSettings());
    document
      .getElementById("close-settings")
      .addEventListener("click", () => toggleSettings(false));
    overlay.addEventListener("click", () => toggleSettings(false));
    document.addEventListener("keydown", handleGlobalKeyDown);

    themeButtons.forEach((btn) => {
      btn.addEventListener("click", () => applyTheme(btn.getAttribute("data-theme")));
    });

    difficultyButtons.forEach((btn) => {
      btn.addEventListener("click", () =>
        applyDifficulty(btn.getAttribute("data-difficulty"))
      );
    });

    symbolButtons.forEach((btn) => {
      btn.addEventListener("click", () => applySymbol(btn.getAttribute("data-symbol")));
    });

    // Apply stored preferences
    applyTheme(safeStorage.get(storageKeys.theme, "light"), { skipSave: true });
    applyDifficulty(aiDifficulty, { skipSave: true });
    applySymbol(playerSymbol, { skipSave: true, skipReset: true });

    resetRound(true);
  }

  function setActiveButton(buttons, value, dataKey) {
    buttons.forEach((btn) => {
      const isActive = btn.getAttribute(`data-${dataKey}`) === value;
      btn.classList.toggle("active", isActive);
    });
  }

  function handleCellClick(cell) {
    const index = Number(cell.getAttribute("data-index"));

    if (
      Number.isNaN(index) ||
      board[index] !== "" ||
      !gameActive ||
      currentPlayer !== playerSymbol
    ) {
      return;
    }

    makeMove(index, playerSymbol);

    if (gameActive) {
      setTimeout(makeAiMove, 500);
    }
  }

  function makeMove(index, symbol) {
    if (!Number.isInteger(index) || index < 0 || index >= board.length) {
      return;
    }

    board[index] = symbol;
    moveHistory.push({
      index,
      symbol,
    });

    const cell = cells[index];
    if (!cell) {
      return;
    }

    cell.textContent = symbol;
    cell.classList.add(symbol.toLowerCase());
    cell.setAttribute("aria-label", `${symbol} placed on cell ${index + 1}`);

    updateHistory(`${symbol} played at position ${index + 1}`);

    if (checkWin(symbol)) {
      endGame(false);
    } else if (checkDraw()) {
      endGame(true);
    } else {
      currentPlayer = currentPlayer === "X" ? "O" : "X";
      updateStatusMessage();
    }
  }

  function makeAiMove() {
    if (!gameActive || currentPlayer !== aiSymbol) {
      return;
    }

    let moveIndex = null;

    switch (aiDifficulty) {
      case "hard":
        moveIndex = getBestMove();
        break;
      case "medium":
        moveIndex = Math.random() < 0.7 ? getSmartMove() : getRandomMove();
        break;
      case "easy":
      default:
        moveIndex = Math.random() < 0.3 ? getSmartMove() : getRandomMove();
        break;
    }

    if (moveIndex === null || moveIndex === undefined) {
      // No valid moves available
      endGame(true);
      return;
    }

    makeMove(moveIndex, aiSymbol);
  }

  function getRandomMove() {
    const availableMoves = board
      .map((cell, index) => (cell === "" ? index : null))
      .filter((index) => index !== null);

    if (availableMoves.length === 0) {
      return null;
    }

    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  function getSmartMove() {
    for (let i = 0; i < winningConditions.length; i++) {
      const [a, b, c] = winningConditions[i];
      if (board[a] === aiSymbol && board[b] === aiSymbol && board[c] === "") {
        return c;
      }
      if (board[a] === aiSymbol && board[c] === aiSymbol && board[b] === "") {
        return b;
      }
      if (board[b] === aiSymbol && board[c] === aiSymbol && board[a] === "") {
        return a;
      }
    }

    for (let i = 0; i < winningConditions.length; i++) {
      const [a, b, c] = winningConditions[i];
      if (board[a] === playerSymbol && board[b] === playerSymbol && board[c] === "") {
        return c;
      }
      if (board[a] === playerSymbol && board[c] === playerSymbol && board[b] === "") {
        return b;
      }
      if (board[b] === playerSymbol && board[c] === playerSymbol && board[a] === "") {
        return a;
      }
    }

    if (board[4] === "") {
      return 4;
    }

    const corners = [0, 2, 6, 8].filter((cornerIndex) => board[cornerIndex] === "");
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    return getRandomMove();
  }

  function getBestMove() {
    function minimax(newBoard, depth, isMaximizing) {
      const winner = checkWinningCondition(newBoard);
      if (winner === aiSymbol) return 10 - depth;
      if (winner === playerSymbol) return depth - 10;
      if (checkBoardFull(newBoard)) return 0;

      if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
          if (newBoard[i] === "") {
            newBoard[i] = aiSymbol;
            const score = minimax(newBoard, depth + 1, false);
            newBoard[i] = "";
            bestScore = Math.max(score, bestScore);
          }
        }
        return bestScore;
      }

      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (newBoard[i] === "") {
          newBoard[i] = playerSymbol;
          const score = minimax(newBoard, depth + 1, true);
          newBoard[i] = "";
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }

    function checkWinningCondition(testBoard) {
      for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (testBoard[a] && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c]) {
          return testBoard[a];
        }
      }
      return null;
    }

    function checkBoardFull(testBoard) {
      return testBoard.every((cell) => cell !== "");
    }

    let bestScore = -Infinity;
    let bestMove = null;

    if (Math.random() < 0.2) {
      return getRandomMove();
    }

    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {
        board[i] = aiSymbol;
        const score = minimax(board, 0, false);
        board[i] = "";
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    return bestMove !== null ? bestMove : getRandomMove();
  }

  function checkWin(symbol) {
    for (let i = 0; i < winningConditions.length; i++) {
      const [a, b, c] = winningConditions[i];
      if (board[a] === symbol && board[b] === symbol && board[c] === symbol) {
        cells[a].classList.add("winner");
        cells[b].classList.add("winner");
        cells[c].classList.add("winner");
        return true;
      }
    }

    return false;
  }

  function checkDraw() {
    return board.every((cell) => cell !== "");
  }

  function endGame(isDraw) {
    gameActive = false;

    if (isDraw) {
      statusDisplay.textContent = "It's a draw!";
      gameHistory.push({
        result: "draw",
        moves: [...moveHistory],
      });
    } else if (currentPlayer === playerSymbol) {
      statusDisplay.textContent = "You won!";
      playerScore++;
      playerScoreDisplay.textContent = playerScore;
      gameHistory.push({
        result: "player win",
        moves: [...moveHistory],
      });
    } else {
      statusDisplay.textContent = "AI won!";
      aiScore++;
      aiScoreDisplay.textContent = aiScore;
      gameHistory.push({
        result: "ai win",
        moves: [...moveHistory],
      });
    }

    updateTurnIndicator();
    updateScoreHighlights();
  }

  function undoMove() {
    if (moveHistory.length < 2 || !gameActive) {
      return;
    }

    const aiMove = moveHistory.pop();
    const playerMove = moveHistory.pop();

    resetCell(aiMove.index);
    resetCell(playerMove.index);

    board[aiMove.index] = "";
    board[playerMove.index] = "";

    updateHistory("Moves undone");

    currentPlayer = playerSymbol;
    updateStatusMessage();
  }

  function resetCell(index) {
    const cell = cells[index];
    if (!cell) return;
    cell.textContent = "";
    cell.classList.remove("x", "o", "winner");
    cell.setAttribute("aria-label", `Empty cell ${index + 1}`);
  }

  function resetRound(silent = false) {
    board = Array(9).fill("");
    gameActive = true;
    moveHistory = [];

    cells.forEach((cell) => {
      const cellIndex = Number(cell.getAttribute("data-index"));
      cell.textContent = "";
      cell.classList.remove("x", "o", "winner");
      cell.setAttribute("aria-label", `Empty cell ${cellIndex + 1}`);
    });

    currentPlayer = "X";
    if (playerSymbol === "O") {
      currentPlayer = aiSymbol;
    }

    updateStatusMessage();

    if (playerSymbol === "O") {
      setTimeout(() => {
        if (gameActive && currentPlayer === aiSymbol) {
          makeAiMove();
        }
      }, 450);
    }

    if (!silent) {
      updateHistory("Round reset");
    }
  }

  function resetScores() {
    playerScore = 0;
    aiScore = 0;
    playerScoreDisplay.textContent = "0";
    aiScoreDisplay.textContent = "0";
    gameHistory = [];
    updateHistory("Scores reset");
    updateStatusMessage();
  }

  function updateStatusMessage() {
    if (gameActive) {
      statusDisplay.textContent =
        currentPlayer === playerSymbol ? "Your turn!" : "AI is thinking...";
    }

    updateTurnIndicator();
    updateScoreHighlights();
  }

  function updateTurnIndicator() {
    if (!turnIndicator) {
      return;
    }

    if (!gameActive) {
      turnIndicator.textContent = "Round complete";
      return;
    }

    const turnOwner = currentPlayer === playerSymbol ? "Your move" : "AI thinking";
    turnIndicator.textContent = `${turnOwner} (${currentPlayer})`;
  }

  function updateScoreHighlights() {
    if (scoreBoxes.length < 2) {
      return;
    }

    const [playerBox, aiBox] = scoreBoxes;
    playerBox.classList.toggle("is-active", gameActive && currentPlayer === playerSymbol);
    aiBox.classList.toggle("is-active", gameActive && currentPlayer === aiSymbol);
  }

  function updateHistory(message) {
    if (!message) {
      return;
    }

    const historyItem = document.createElement("div");
    historyItem.classList.add("history-move");
    historyItem.textContent = message;
    historyList.prepend(historyItem);

    while (historyList.children.length > 10) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  function toggleHistory() {
    const shouldShow = historyContainer.style.display !== "block";
    historyContainer.style.display = shouldShow ? "block" : "none";
    historyContainer.setAttribute("aria-hidden", (!shouldShow).toString());
    historyButton.textContent = shouldShow ? "Hide History" : "Show History";
    historyButton.setAttribute("aria-expanded", shouldShow.toString());
  }

  function toggleSettings(forceState) {
    const shouldShow =
      typeof forceState === "boolean"
        ? forceState
        : !settingsPanel.classList.contains("is-visible");

    settingsPanel.classList.toggle("is-visible", shouldShow);
    overlay.classList.toggle("is-visible", shouldShow);
    document.body.classList.toggle("no-scroll", shouldShow);
    settingsPanel.setAttribute("aria-hidden", (!shouldShow).toString());
    overlay.setAttribute("aria-hidden", (!shouldShow).toString());
    settingsButton.setAttribute("aria-expanded", shouldShow.toString());

    if (shouldShow) {
      settingsPanel.focus({ preventScroll: true });
    } else {
      settingsButton.focus({ preventScroll: true });
    }
  }

  function handleGlobalKeyDown(event) {
    if (event.key === "Escape" && settingsPanel.classList.contains("is-visible")) {
      toggleSettings(false);
    }
  }

  function applyTheme(theme, { skipSave = false } = {}) {
    document.body.setAttribute("data-theme", theme);
    setActiveButton(themeButtons, theme, "theme");
    if (!skipSave) {
      safeStorage.set(storageKeys.theme, theme);
    }
  }

  function applyDifficulty(difficulty, { skipSave = false } = {}) {
    aiDifficulty = difficulty;
    setActiveButton(difficultyButtons, difficulty, "difficulty");
    if (!skipSave) {
      safeStorage.set(storageKeys.difficulty, difficulty);
    }
  }

  function applySymbol(symbol, { skipSave = false, skipReset = false } = {}) {
    playerSymbol = symbol;
    aiSymbol = playerSymbol === "X" ? "O" : "X";
    setActiveButton(symbolButtons, symbol, "symbol");

    if (!skipSave) {
      safeStorage.set(storageKeys.symbol, symbol);
    }

    if (!skipReset) {
      resetRound(true);
    } else {
      updateStatusMessage();
    }
  }
});
