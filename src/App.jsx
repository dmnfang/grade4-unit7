import { useEffect, useMemo, useRef, useState } from 'react';
import { buildRounds, fmt, imagesReady, shuffle } from './data.js';
import Item, { ItemGrid } from './Item.jsx';
import { installSound, sound, useSoundSettings } from './sound.js';

const TEAM_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function Block({ label, children }) {
  return (
    <div className="settings-block">
      <div className="settings-label">{label}</div>
      <div className="toggle-group">{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button className={`toggle-pill ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

// Header button back to settings. Two taps so a stray tap can't wipe a run.
function SettingsBtn({ onConfirm }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      className={`topbar-action secondary ${armed ? 'armed' : ''}`}
      data-sound="close"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? 'Tap again to reset' : 'Settings'}
    </button>
  );
}

function Pips({ total, current, allDone = false }) {
  return (
    <div className="pips" aria-label={`Pair ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`pip ${allDone || i < current ? 'done' : i === current ? 'now' : ''}`} />
      ))}
    </div>
  );
}

function Collage({ rounds }) {
  const cells = useMemo(() => {
    const all = rounds.flatMap((r) => Array.from({ length: r.qty }, () => r.item));
    const w = window.innerWidth - 120;
    const h = Math.max(160, window.innerHeight - 500);
    const size = Math.max(24, Math.min(120, Math.floor(Math.sqrt((w * h) / all.length) * 0.9)));
    return { size, h, list: shuffle(all).map((item) => ({ item, rot: Math.round(Math.random() * 24 - 12) })) };
  }, [rounds]);

  useEffect(() => {
    const ids = [];
    for (let i = 0; i < Math.min(cells.list.length, 40); i += 4) {
      ids.push(setTimeout(() => sound.play('tilePop', { rate: [0.9, 1.4], minGap: 30 }), Math.min(i * 25, 1000)));
    }
    return () => ids.forEach(clearTimeout);
  }, [cells]);

  return (
    <div className="collage" style={{ height: `${cells.h}px` }}>
      {cells.list.map(({ item, rot }, i) => (
        <Item
          key={i}
          item={item}
          className="cell"
          style={{ '--s': `${cells.size}px`, '--rot': `${rot}deg`, animationDelay: `${Math.min(i * 25, 1000)}ms` }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState('setup');
  const [teamCount, setTeamCount] = useState(4);
  const [players, setPlayers] = useState(5);
  const [team, setTeam] = useState(0);
  const [pair, setPair] = useState(0);
  const [rounds, setRounds] = useState([]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [roundLimit, setRoundLimit] = useState('open'); // one-team mode: 'open' or a number
  const [roundNo, setRoundNo] = useState(1);
  const t0 = useRef(0);
  const solo = teamCount === 1;
  const { sfxOn, toggleSfx } = useSoundSettings();

  useEffect(() => installSound(), []);

  useEffect(() => {
    imagesReady.then(() => setImagesLoaded(true));
  }, []);

  useEffect(() => {
    if (screen === 'scores') sound.play('allDone');
  }, [screen]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(performance.now() - t0.current), 50);
    return () => clearInterval(id);
  }, [running]);

  const startTeam = (i, round = 1) => {
    setTeam(i);
    setRoundNo(round);
    setPair(0);
    setRounds(buildRounds(players));
    setElapsed(0);
    setRunning(false);
    setScreen('play');
  };

  const startTimer = () => {
    t0.current = performance.now();
    setRunning(true);
  };

  const finish = () => {
    if (!running) return;
    const final = performance.now() - t0.current;
    setRunning(false);
    setElapsed(final);
    setResults((r) => [...r, { team, roundNo, time: final, rounds }]);
    setScreen('finish');
    sound.play('celebration');
  };

  const nextTeam = () => (team + 1 < teamCount ? startTeam(team + 1) : setScreen('scores'));

  const newGame = () => {
    setRunning(false);
    setElapsed(0);
    setResults([]);
    setScreen('setup');
  };

  /* ---------- settings ---------- */
  if (screen === 'setup') {
    return (
      <div className="setup-screen">
        <div className="app-header">
          <h1 className="brand-name">What do you want?</h1>
          <span />
          <div className="topbar-right">
            <button
              className="topbar-action secondary"
              data-sound="none"
              onClick={toggleSfx}
              aria-label={sfxOn ? 'Turn sound off' : 'Turn sound on'}
            >
              {sfxOn ? '🔊' : '🔇'}
            </button>
            <a className="nav-btn back-home-btn" href="https://dmnfang.github.io">Home</a>
          </div>
        </div>

        <div className="setup-body">
          <div className="setup-panel">
            <div className="panel-title">Team Settings</div>
            <div className="settings-scroll">
              <Block label="Teams">
                {TEAM_OPTIONS.map((n) => (
                  <Pill key={n} active={teamCount === n} onClick={() => setTeamCount(n)}>{n}</Pill>
                ))}
              </Block>
              {solo && (
                <Block label="Rounds">
                  <Pill active={roundLimit === 'open'} onClick={() => setRoundLimit('open')}>Unlimited</Pill>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pill key={n} active={roundLimit === n} onClick={() => setRoundLimit(n)}>{n}</Pill>
                  ))}
                </Block>
              )}
              <Block label="Players per Team">
                {PLAYER_OPTIONS.map((n) => (
                  <Pill key={n} active={players === n} onClick={() => setPlayers(n)}>{n}</Pill>
                ))}
              </Block>
            </div>
            <button className="launch-btn" disabled={!imagesLoaded} onClick={() => startTeam(0)}>
              {imagesLoaded ? 'Start' : 'Loading images…'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- play ---------- */
  if (screen === 'play') {
    const r = rounds[pair];
    const last = pair === players - 1;
    const a = pair + 1;
    const b = last ? 1 : pair + 2;
    const lines = [
      ['asker', a, <>What do you want?</>],
      ['replier', b, <>I want <span className="picked">{r.item.name}</span>, please.</>],
      ['asker', a, <>How many?</>],
      ['replier', b, <><span className="picked">{r.qty}</span>, please.</>],
      ['asker', a, <>Here you are.</>],
      ['replier', b, <>Thank you.</>],
    ];
    return (
      <>
        <div className="topbar">
          <div className="title">{solo ? `Round ${roundNo}` : `Team ${team + 1}`}</div>
          <Pips total={players} current={pair} />
          <div className="topbar-right">
            {!running && (
              <button className="topbar-action" data-sound="launch" onClick={startTimer}>Start timer</button>
            )}
            <SettingsBtn onConfirm={newGame} />
          </div>
        </div>

        <div className="body">
          <div className="script-panel">
            {lines.map(([role, num, text], i) => (
              <div key={i} className="line">
                <div className={`avatar ${role}`}>{num}</div>
                <p className="say">{text}</p>
              </div>
            ))}
          </div>
          <div className="item-panel">
            <div className="menu-card">
              <div className="pic"><ItemGrid item={r.item} qty={r.qty} /></div>
            </div>
          </div>
        </div>

        <div className="go-bar">
          <div className="timer-box">{fmt(elapsed)}</div>
          {last ? (
            <button className="big-btn finish" data-sound="none" disabled={!running} onClick={finish}>Finish</button>
          ) : (
            <button className="big-btn" data-sound="nextCard" disabled={!running} onClick={() => setPair(pair + 1)}>Next</button>
          )}
        </div>
      </>
    );
  }

  /* ---------- finish ---------- */
  if (screen === 'finish') {
    const isLast = team + 1 >= teamCount;
    const atLimit = roundLimit !== 'open' && roundNo >= roundLimit;
    return (
      <>
        <div className="topbar">
          <div className="title">{solo ? `Round ${roundNo}` : `Team ${team + 1}`}</div>
          <Pips total={players} current={players} allDone />
          <div className="topbar-right"><SettingsBtn onConfirm={newGame} /></div>
        </div>
        <div className="body">
          <div className="collage-panel">
            <div className="wow">Wow, nice salad!</div>
            <div className="final-time">{fmt(elapsed)}</div>
            <Collage rounds={results[results.length - 1].rounds} />
          </div>
        </div>
        <div className="go-bar">
          {solo && !atLimit ? (
            <>
              <button className="big-btn" data-sound="modalOpen" onClick={() => startTeam(0, roundNo + 1)}>Revenge round</button>
              <button className="big-btn secondary" data-sound="targetSelect" onClick={() => setScreen('scores')}>End game</button>
            </>
          ) : (
            <button className="big-btn" data-sound={isLast ? 'targetSelect' : 'modalOpen'} onClick={nextTeam}>
              {isLast ? 'Display scores' : 'Start next team'}
            </button>
          )}
        </div>
      </>
    );
  }

  /* ---------- scoreboard ---------- */
  const ranked = solo ? results : [...results].sort((x, y) => x.time - y.time);
  const fastest = Math.min(...results.map((r) => r.time));
  return (
    <>
      <div className="topbar">
        <div className="title">Scoreboard</div>
        <span />
        <div className="topbar-right">
          <SettingsBtn onConfirm={newGame} />
        </div>
      </div>
      <div className="body">
        <ol className="score-list">
          {ranked.map((r, i) =>
            solo ? (
              <li key={r.roundNo} className={`score-row solo ${r.time === fastest ? 'fastest' : ''}`}>
                <span>Round {r.roundNo}</span>
                <span className="score-time">{fmt(r.time)}</span>
              </li>
            ) : (
              <li key={r.team} className={`score-row ${i === 0 ? 'first' : ''}`}>
                <span className="rank">{i + 1}</span>
                <span>Team {r.team + 1}</span>
                <span className="score-time">{fmt(r.time)}</span>
              </li>
            )
          )}
        </ol>
      </div>
    </>
  );
}
