import React, { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { chooseMove } from './engine.js'
import { RotateCcw, Undo2, Crown, Bot, Users, ChevronLeft, Sparkles, Menu } from 'lucide-react'

const symbols = {
  wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙',
  bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟'
}
const files = 'abcdefgh'
const pieceName = { k:'شاه', q:'وزیر', r:'رخ', b:'فیل', n:'اسب', p:'پیاده' }

function App() {
  const [game, setGame] = useState(() => new Chess())
  const [mode, setMode] = useState('ai')
  const [aiColor, setAiColor] = useState('b')
  const [selected, setSelected] = useState(null)
  const [targets, setTargets] = useState([])
  const [history, setHistory] = useState([])
  const [busy, setBusy] = useState(false)
  const [difficulty, setDifficulty] = useState(2)
  const [flipped, setFlipped] = useState(false)
  const [notice, setNotice] = useState('نوبت سفید')
  const [promotion, setPromotion] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const board = game.board()
  const isAiTurn = mode === 'ai' && game.turn() === aiColor && !game.isGameOver()
  const lastMove = history.at(-1)
  const checkSquare = useMemo(() => {
    if (!game.isCheck()) return null
    const kingColor = game.turn()
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      const p = board[r][c]
      if (p?.type === 'k' && p.color === kingColor) return `${files[c]}${8-r}`
    }
    return null
  }, [game, board])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return
    tg.ready()
    tg.expand()
    tg.setHeaderColor?.('#101820')
    tg.setBackgroundColor?.('#101820')
    tg.enableClosingConfirmation?.()
  }, [])

  useEffect(() => {
    if (!isAiTurn || busy) return
    setBusy(true)
    const timer = setTimeout(() => {
      const move = chooseMove(game.fen(), difficulty)
      if (move) {
        const next = new Chess(game.fen())
        const played = next.move({ from: move.from, to: move.to, promotion: 'q' })
        setGame(next)
        setHistory(h => [...h, played])
        setNotice(next.isGameOver() ? resultText(next) : next.isCheck() ? 'کیش!' : 'نوبت شما')
      }
      setBusy(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [isAiTurn, game, difficulty])

  function resultText(g) {
    if (g.isCheckmate()) return `کیش‌ومات! برنده: ${g.turn() === 'w' ? 'سیاه' : 'سفید'}`
    if (g.isStalemate()) return 'پات؛ بازی مساوی شد'
    if (g.isThreefoldRepetition()) return 'تکرار سه‌باره؛ مساوی'
    if (g.isInsufficientMaterial()) return 'مهره کافی نیست؛ مساوی'
    if (g.isDraw()) return 'بازی مساوی شد'
    return 'بازی تمام شد'
  }
  function status(g = game) {
    if (g.isGameOver()) return resultText(g)
    if (g.isCheck()) return `کیش به ${g.turn() === 'w' ? 'سفید' : 'سیاه'}`
    return `نوبت ${g.turn() === 'w' ? 'سفید' : 'سیاه'}`
  }
  function chooseSquare(square) {
    if (game.isGameOver() || busy || isAiTurn) return
    const piece = game.get(square)
    if (selected && targets.includes(square)) {
      const moving = game.get(selected)
      if (moving?.type === 'p' && (square.endsWith('8') || square.endsWith('1'))) {
        setPromotion({ from: selected, to: square })
        return
      }
      commitMove(selected, square)
      return
    }
    if (piece && piece.color === game.turn()) {
      setSelected(square)
      setTargets(game.moves({ square, verbose: true }).map(m => m.to))
    } else {
      setSelected(null)
      setTargets([])
    }
  }
  function commitMove(from, to, promotion = 'q') {
    try {
      const next = new Chess(game.fen())
      const move = next.move({ from, to, promotion })
      if (!move) return
      setGame(next)
      setHistory(h => [...h, move])
      setSelected(null)
      setTargets([])
      setPromotion(null)
      setNotice(status(next))
      const tg = window.Telegram?.WebApp
      tg?.HapticFeedback?.impactOccurred?.('light')
    } catch { setNotice('این حرکت مجاز نیست') }
  }
  function newGame(nextMode = mode) {
    const fresh = new Chess()
    setGame(fresh); setHistory([]); setSelected(null); setTargets([])
    setPromotion(null); setBusy(false); setMode(nextMode)
    setNotice('نوبت سفید')
    setFlipped(nextMode === 'ai' && aiColor === 'w')
  }
  function undo() {
    if (!history.length || busy) return
    let remove = mode === 'ai' ? Math.min(2, history.length) : 1
    const remaining = history.slice(0, Math.max(0, history.length-remove))
    const next = new Chess()
    for (const move of remaining) next.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' })
    setGame(next)
    setHistory(remaining)
    setSelected(null); setTargets([]); setPromotion(null)
    setNotice(status(next))
  }
  function selectMode(value) {
    setAiColor('b')
    newGame(value)
  }
  const rows = [...Array(8)].map((_,i) => flipped ? 7-i : i)
  const cols = [...Array(8)].map((_,i) => flipped ? 7-i : i)
  const moveList = history.map((m,i) => `${i%2===0 ? `${Math.floor(i/2)+1}. ` : ''}${m.san}`).join('  ')

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">♞</div><div><div className="brand-name">RichChess</div><div className="brand-sub">PLAY • THINK • WIN</div></div></div>
      <button className="icon-btn" onClick={() => setMenuOpen(v=>!v)} aria-label="منو"><Menu size={20}/></button>
    </header>
    {menuOpen && <div className="menu-panel">
      <button onClick={() => {setFlipped(v=>!v);setMenuOpen(false)}}>چرخاندن صفحه</button>
      <button onClick={() => {newGame(mode);setMenuOpen(false)}}>شروع بازی تازه</button>
    </div>}
    <section className="intro">
      <div className="eyebrow"><Sparkles size={13}/> THE ROYAL GAME</div>
      <h1>یک حرکت جلوتر <span>باش.</span></h1>
      <p>صفحه را بخوان، نقشه بکش و شاه را مات کن.</p>
    </section>

    <section className="mode-switch">
      <button className={mode==='ai'?'active':''} onClick={() => selectMode('ai')}><Bot size={17}/> مقابل هوش مصنوعی</button>
      <button className={mode==='local'?'active':''} onClick={() => selectMode('local')}><Users size={17}/> دونفره</button>
    </section>

    <section className="game-panel">
      <div className="player-row">
        <div className={`avatar dark-avatar ${game.turn()==='b'?'turn':''}`}>♚</div>
        <div className="player-meta"><strong>{mode==='ai' && aiColor==='w'?'شما':'بازیکن سیاه'}</strong><small>{mode==='ai' && aiColor==='b'?'حریف هوشمند':'مهره‌های سیاه'}</small></div>
        <div className="player-state">{game.turn()==='b'?'در حال بازی':''}</div>
      </div>

      <div className="board-frame">
        <div className="board">
          {rows.map((r,ri) => cols.map((c,ci) => {
            const square = `${files[c]}${8-r}`
            const piece = board[r][c]
            const light = (r+c)%2===1
            const isTarget = targets.includes(square)
            const isLast = lastMove && (lastMove.from===square || lastMove.to===square)
            return <button key={square} className={`square ${light?'light':'dark'} ${selected===square?'selected':''} ${isTarget?'target':''} ${isLast?'last-move':''} ${checkSquare===square?'in-check':''}`} onClick={() => chooseSquare(square)} aria-label={square}>
              {ci===0 && <span className="rank-label">{8-r}</span>}
              {ri===7 && <span className="file-label">{files[c]}</span>}
              {piece && <span className={`piece ${piece.color==='w'?'white-piece':'black-piece'}`}>{symbols[piece.color+piece.type]}</span>}
              {isTarget && !piece && <span className="target-dot"/>}
              {isTarget && piece && <span className="capture-ring"/>}
            </button>
          })) }
        </div>
      </div>

      <div className="player-row bottom-player">
        <div className={`avatar light-avatar ${game.turn()==='w'?'turn':''}`}>♔</div>
        <div className="player-meta"><strong>{mode==='ai' && aiColor==='b'?'شما':'بازیکن سفید'}</strong><small>{mode==='ai' && aiColor==='b'?'شما':'مهره‌های سفید'}</small></div>
        <div className="player-state">{game.turn()==='w'?'در حال بازی':''}</div>
      </div>
      <div className={`status-line ${game.isCheck()?'check':''}`}>
        <span className="status-dot"/>{busy?'هوش مصنوعی در حال فکر کردن…':status()}
      </div>
    </section>

    <section className="controls">
      <button className="primary-btn" onClick={() => newGame()}><RotateCcw size={17}/> بازی جدید</button>
      <button className="secondary-btn" onClick={undo} disabled={!history.length || busy}><Undo2 size={17}/> بازگشت حرکت</button>
      <button className="secondary-btn square-action" onClick={() => setFlipped(v=>!v)} aria-label="چرخاندن صفحه"><RotateCcw size={17}/></button>
    </section>

    {mode==='ai' && <section className="settings-row">
      <span>سطح هوش مصنوعی</span>
      <div className="difficulty">
        {[1,2,3].map((d)=><button key={d} className={difficulty===d?'chosen':''} onClick={()=>setDifficulty(d)}>{['آسان','متوسط','سخت'][d-1]}</button>)}
      </div>
    </section>}

    {game.isGameOver() && <div className="result-card"><Crown size={25}/><div><strong>{resultText(game)}</strong><small>برای یک رقابت تازه آماده‌ای؟</small></div><button onClick={()=>newGame()}>بازی مجدد</button></div>}

    <section className="moves-card">
      <div className="section-heading"><strong>حرکت‌های بازی</strong><span>{history.length} حرکت</span></div>
      <div className="moves-content">{moveList || <span className="empty-moves">هنوز حرکتی انجام نشده است</span>}</div>
    </section>
    <footer>RICHCHESS <span>·</span> ساخته‌شده برای تلگرام</footer>

    {promotion && <div className="modal-backdrop"><div className="promotion-modal"><strong>ارتقای پیاده</strong><p>مهره موردنظر را انتخاب کن</p><div>{['q','r','b','n'].map(t=><button key={t} onClick={()=>commitMove(promotion.from,promotion.to,t)}>{symbols[game.turn()+t]}</button>)}</div></div></div>}
  </main>
}
export default App
