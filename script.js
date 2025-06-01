document.addEventListener("DOMContentLoaded", () => {
  // Game state
  let board = ["", "", "", "", "", "", "", "", ""];
  let currentPlayer = "X";
  let gameActive = true;
  let playerSymbol = "X";
  let aiSymbol = "O";
  let playerScore = 0;
  let aiScore = 0;
  let moveHistory = [];
  let gameHistory = [];
  let aiDifficulty = "easy";

  // DOM elements
  const boardElement = document.getElementById("board");
  const cells = document.querySelectorAll(".cell");
  const statusDisplay = document.getElementById("status");
  const playerScoreDisplay = document.getElementById("player-score");
  const aiScoreDisplay = document.getElementById("ai-score");
  const historyContainer = document.getElementById("history-container");
  const historyList = document.getElementById("history-list");
  const settingsPanel = document.getElementById("settings-panel");
  const overlay = document.getElementById("overlay");

  // Winning combinations
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

  // Initialize game
  initGame();

  function initGame() {
    cells.forEach((cell) => {
      cell.addEventListener("click", () => handleCellClick(cell));
      cell.textContent = "";
      cell.classList.remove("x", "o", "winner");
    });

    document.getElementById("undo-btn").addEventListener("click", undoMove);
    document
      .getElementById("reset-round-btn")
      .addEventListener("click", resetRound);
    document
      .getElementById("reset-scores-btn")
      .addEventListener("click", resetScores);
    document
      .getElementById("history-btn")
      .addEventListener("click", toggleHistory);
    document
      .getElementById("settings-btn")
      .addEventListener("click", toggleSettings);
    document
      .getElementById("close-settings")
      .addEventListener("click", toggleSettings);
    overlay.addEventListener("click", toggleSettings);

    // Theme buttons
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".theme-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.body.setAttribute(
          "data-theme",
          btn.getAttribute("data-theme")
        );
      });
    });

    // Difficulty buttons
    document.querySelectorAll(".difficulty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".difficulty-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        aiDifficulty = btn.getAttribute("data-difficulty");
      });
    });

    // Symbol buttons
    document.querySelectorAll(".symbol-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".symbol-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const newSymbol = btn.getAttribute("data-symbol");
        if (newSymbol !== playerSymbol) {
          playerSymbol = newSymbol;
          aiSymbol = playerSymbol === "X" ? "O" : "X";
          resetRound();

          // If AI goes first (player is O)
          if (playerSymbol === "O") {
            setTimeout(makeAiMove, 500);
          }
        }
      });
    });

    updateStatusMessage();
  }

  function handleCellClick(cell) {
    const index = cell.getAttribute("data-index");

    if (board[index] !== "" || !gameActive || currentPlayer !== playerSymbol) {
      return;
    }

    makeMove(index, playerSymbol);

    if (gameActive) {
      setTimeout(makeAiMove, 500);
    }
  }

  function makeMove(index, symbol) {
    board[index] = symbol;
    moveHistory.push({
      index: index,
      symbol: symbol,
    });

    const cell = cells[index];
    cell.textContent = symbol;
    cell.classList.add(symbol.toLowerCase());

    updateHistory(`${symbol} played at position ${parseInt(index) + 1}`);

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

    let moveIndex;

    switch (aiDifficulty) {
      case "hard":
        moveIndex = getBestMove();
        break;
      case "medium":
        if (Math.random() < 0.7) {
          moveIndex = getSmartMove();
        } else {
          moveIndex = getRandomMove();
        }
        break;
      case "easy":
      default:
        if (Math.random() < 0.3) {
          moveIndex = getSmartMove();
        } else {
          moveIndex = getRandomMove();
        }
        break;
    }

    makeMove(moveIndex, aiSymbol);
  }

  function getRandomMove() {
    const availableMoves = board
      .map((cell, index) => (cell === "" ? index : null))
      .filter((index) => index !== null);
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  function getSmartMove() {
    // First try to win
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

    // Then try to block
    for (let i = 0; i < winningConditions.length; i++) {
      const [a, b, c] = winningConditions[i];
      if (
        board[a] === playerSymbol &&
        board[b] === playerSymbol &&
        board[c] === ""
      ) {
        return c;
      }
      if (
        board[a] === playerSymbol &&
        board[c] === playerSymbol &&
        board[b] === ""
      ) {
        return b;
      }
      if (
        board[b] === playerSymbol &&
        board[c] === playerSymbol &&
        board[a] === ""
      ) {
        return a;
      }
    }

    // Take center if available
    if (board[4] === "") {
      return 4;
    }

    // Take a random corner
    const corners = [0, 2, 6, 8].filter((index) => board[index] === "");
    if (corners.length > 0) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    // Take any available move
    return getRandomMove();
  }

  function getBestMove() {
    // Minimax implementation for unbeatable AI
    function minimax(newBoard, depth, isMaximizing) {
      // Check for terminal states
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
      } else {
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
    }

    function checkWinningCondition(board) {
      for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          return board[a];
        }
      }
      return null;
    }

    function checkBoardFull(board) {
      return board.every((cell) => cell !== "");
    }

    // Actual minimax move calculation
    let bestScore = -Infinity;
    let bestMove;

    // Add randomness to make the AI beatable occasionally on hard difficulty
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

    return bestMove;
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
    } else {
      if (currentPlayer === playerSymbol) {
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
    }
  }

  function undoMove() {
    if (moveHistory.length < 2 || !gameActive) {
      return;
    }

    // Undo both AI and player moves
    const aiMove = moveHistory.pop();
    const playerMove = moveHistory.pop();

    // Reset the cells
    cells[aiMove.index].textContent = "";
    cells[aiMove.index].classList.remove("x", "o");
    board[aiMove.index] = "";

    cells[playerMove.index].textContent = "";
    cells[playerMove.index].classList.remove("x", "o");
    board[playerMove.index] = "";

    // Update history display
    updateHistory("Moves undone");

    currentPlayer = playerSymbol;
    updateStatusMessage();
  }

  function resetRound() {
    board = ["", "", "", "", "", "", "", "", ""];
    gameActive = true;
    moveHistory = [];

    cells.forEach((cell) => {
      cell.textContent = "";
      cell.classList.remove("x", "o", "winner");
    });

    currentPlayer = "X";
    updateStatusMessage();

    // If player is O, AI goes first
    if (playerSymbol === "O") {
      setTimeout(makeAiMove, 500);
    }

    updateHistory("Round reset");
  }

  function resetScores() {
    playerScore = 0;
    aiScore = 0;
    playerScoreDisplay.textContent = "0";
    aiScoreDisplay.textContent = "0";
    gameHistory = [];
    updateHistory("Scores reset");
  }

  function updateStatusMessage() {
    if (gameActive) {
      if (currentPlayer === playerSymbol) {
        statusDisplay.textContent = "Your turn!";
      } else {
        statusDisplay.textContent = "AI is thinking...";
      }
    }
  }

  function updateHistory(message) {
    const historyItem = document.createElement("div");
    historyItem.classList.add("history-move");
    historyItem.textContent = message;
    historyList.prepend(historyItem);

    // Limit history items
    if (historyList.children.length > 10) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  function toggleHistory() {
    historyContainer.style.display =
      historyContainer.style.display === "block" ? "none" : "block";
    document.getElementById("history-btn").textContent =
      historyContainer.style.display === "block"
        ? "Hide History"
        : "Show History";
  }

  function toggleSettings() {
    const isVisible = settingsPanel.style.display === "block";
    settingsPanel.style.display = isVisible ? "none" : "block";
    overlay.style.display = isVisible ? "none" : "block";
  }
});
