import { Chess } from 'chess.js'

const value = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 }
const pst = {
  p: (r, c, white) => (white ? 6-r : r-1) * 7 + (c >= 2 && c <= 5 ? 5 : 0),
  n: (r, c) => 28 - (Math.abs(3.5-r) + Math.abs(3.5-c)) * 9,
  b: (r, c) => 18 - (Math.abs(3.5-r) + Math.abs(3.5-c)) * 4,
  r: (r, c, white) => (white ? 6-r : r-1) * 2,
  q: (r, c) => 8 - (Math.abs(3.5-r) + Math.abs(3.5-c)) * 2,
  k: (r, c) => -((Math.abs(3.5-r) + Math.abs(3.5-c)) * 3)
}
function evaluate(game) {
  if (game.isCheckmate()) return game.turn() === 'w' ? -100000 : 100000
  if (game.isDraw()) return 0
  let score = 0
  const board = game.board()
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
    const p = board[r][c]
    if (!p) continue
    const sign = p.color === 'w' ? 1 : -1
    score += sign * (value[p.type] + (pst[p.type]?.(r,c,p.color === 'w') || 0))
  }
  return score
}
function orderedMoves(game) {
  return game.moves({ verbose: true }).sort((a,b) => {
    const score = m => (m.captured ? value[m.captured] * 10 - value[m.piece] : 0) + (m.promotion ? value[m.promotion] : 0)
    return score(b)-score(a)
  })
}
function search(game, depth, alpha, beta, maximizing) {
  if (depth === 0 || game.isGameOver()) return evaluate(game)
  const moves = orderedMoves(game)
  if (maximizing) {
    let best = -Infinity
    for (const move of moves) {
      game.move(move)
      best = Math.max(best, search(game, depth-1, alpha, beta, false))
      game.undo()
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const move of moves) {
      game.move(move)
      best = Math.min(best, search(game, depth-1, alpha, beta, true))
      game.undo()
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}
export function chooseMove(fen, depth = 2) {
  const game = new Chess(fen)
  const moves = orderedMoves(game)
  if (!moves.length) return null
  const maximizing = game.turn() === 'w'
  let best = maximizing ? -Infinity : Infinity
  let candidates = []
  for (const move of moves) {
    game.move(move)
    const score = search(game, depth-1, -Infinity, Infinity, !maximizing)
    game.undo()
    if ((maximizing && score > best) || (!maximizing && score < best)) {
      best = score
      candidates = [move]
    } else if (score === best) candidates.push(move)
  }
  return candidates[Math.floor(Math.random() * candidates.length)] || moves[0]
}
