import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fmt, imagesReady, shuffle } from './data.js';
import Item from './Item.jsx';
import FullscreenBtn from './Fullscreen.jsx';
import { installSound, sound, useSoundSettings } from './sound.js';
import { UNIT } from './unit.jsx';

const TEAM_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const FORMATS = [['class', 'Class'], ['pairs', 'Pairs'], ['groups', 'Groups']];
const PAIR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const GROUP_OPTIONS = [2, 3, 4, 5, 6, 7, 8];
const DURATIONS = [[30, '30 sec'], [60, '1 min'], [120, '2 min'], [180, '3 min']];

const fmtCount = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

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

function RoundsBlock({ value, onChange }) {
  return (
    <Block label="Rounds">
      <Pill active={value === 'open'} onClick={() => onChange('open')}>Unlimited</Pill>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pill key={n} active={value === n} onClick={() => onChange(n)}>{n}</Pill>
      ))}
    </Block>
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

// One pip per team/pair/player pair. stroked = current, filled = finished.
function Pips({ total, current, allDone = false, doneCount }) {
  const done = allDone ? total : doneCount ?? current;
  return (
    <div className="pips">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`pip ${i < done ? 'done' : i === current ? 'now' : ''}`} />
      ))}
    </div>
  );
}

// Biggest square size at which n copies fit inside w x h once they wrap.
function fitSize(n, w, h, gap = 4) {
  for (let s = 120; s >= 20; s -= 2) {
    const cols = Math.max(1, Math.floor((w + gap) / (s + gap)));
    const rows = Math.ceil(n / cols);
    if (rows * (s + gap) - gap <= h) return s;
  }
  return 20;
}

function Collage({ rounds }) {
  const ref = useRef(null);
  const [box, setBox] = useState(null);

  // Measure the real space the collage has, so it fits on any screen size.
  useLayoutEffect(() => {
    const el = ref.current;
    const measure = () => setBox({ w: el.clientWidth - 16, h: el.clientHeight - 16 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const list = useMemo(() => {
    const all = rounds.flatMap((r) => Array.from({ length: r.qty }, () => r.item));
    return shuffle(all).map((item) => ({ item, rot: Math.round(Math.random() * 24 - 12) }));
  }, [rounds]);

  const size = box ? fitSize(list.length, box.w, box.h) : 0;

  useEffect(() => {
    if (!size) return;
    const ids = [];
    for (let i = 0; i < Math.min(list.length, 40); i += 4) {
      ids.push(setTimeout(() => sound.play('tilePop', { rate: [0.9, 1.4], minGap: 30 }), Math.min(i * 25, 1000)));
    }
    return () => ids.forEach(clearTimeout);
  }, [list, size > 0]);

  return (
    <div className="collage" ref={ref}>
      {size > 0 &&
        list.map(({ item, rot }, i) => (
          <Item
            key={i}
            item={item}
            className="cell"
            style={{ '--s': `${size}px`, '--rot': `${rot}deg`, animationDelay: `${Math.min(i * 25, 1000)}ms` }}
          />
        ))}
    </div>
  );
}

function SoundBtn({ sfxOn, toggleSfx }) {
  return (
    <button
      className="topbar-action secondary"
      data-sound="none"
      onClick={toggleSfx}
      aria-label={sfxOn ? 'Turn sound off' : 'Turn sound on'}
    >
      {sfxOn ? '🔊' : '🔇'}
    </button>
  );
}

function StartBtn({ loaded, onStart }) {
  return (
    <button className="launch-btn" disabled={!loaded} onClick={onStart}>
      {loaded ? 'Start' : 'Loading images…'}
    </button>
  );
}

export default function App() {
  const [screen, setScreen] = useState('modes'); // modes | setup | rallySetup | play | finish | scores
  const [mode, setMode] = useState('attack');    // attack | rally

  // Time Attack settings
  const [teamCount, setTeamCount] = useState(4);
  const [players, setPlayers] = useState(5);
  const [attackLimit, setAttackLimit] = useState('open');
  // Rally settings
  const [format, setFormat] = useState('class');
  const [pairCount, setPairCount] = useState(5);
  const [groupCount, setGroupCount] = useState(2);
  const [duration, setDuration] = useState(120);
  const [rallyLimit, setRallyLimit] = useState('open');

  // Play state
  const [unitIdx, setUnitIdx] = useState(0);
  const [roundNo, setRoundNo] = useState(1);
  const [pair, setPair] = useState(0);          // Time Attack: which pair in the chain
  const [rounds, setRounds] = useState([]);     // Time Attack: the conversations for this team
  const [cur, setCur] = useState(null);         // Rally: the current conversation
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [results, setResults] = useState([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const t0 = useRef(0);
  const scoreRef = useRef(0);
  const { sfxOn, toggleSfx } = useSoundSettings();

  const isRally = mode === 'rally';
  const units = !isRally ? teamCount : format === 'class' ? 1 : format === 'pairs' ? pairCount : groupCount;
  const solo = units === 1;
  const unitLabel = !isRally ? 'Team' : format === 'pairs' ? 'Pair' : format === 'groups' ? 'Group' : 'Class';
  const limit = isRally ? rallyLimit : attackLimit;
  const title = solo ? `Round ${roundNo}` : `${unitLabel} ${unitIdx + 1}`;
  const setupScreen = isRally ? 'rallySetup' : 'setup';

  useEffect(() => installSound(), []);

  useEffect(() => {
    imagesReady.then(() => setImagesLoaded(true));
  }, []);

  useEffect(() => {
    if (screen === 'scores') sound.play('allDone');
  }, [screen]);

  // The clock: counts up in Time Attack, counts down in Rally.
  useEffect(() => {
    if (!running) return;
    if (!isRally) {
      const id = setInterval(() => setElapsed(performance.now() - t0.current), 50);
      return () => clearInterval(id);
    }
    const end = t0.current + duration * 1000;
    let lastTick = -1;
    const id = setInterval(() => {
      const left = end - performance.now();
      if (left <= 0) {
        clearInterval(id);
        setRemaining(0);
        endRally();
        return;
      }
      setRemaining(left);
      const sec = Math.ceil(left / 1000);
      if (sec <= 5 && sec !== lastTick) {
        lastTick = sec;
        sound.tick({ freq: sec === 1 ? 1600 : 1200 });
      }
    }, 50);
    return () => clearInterval(id);
  }, [running]);

  const startUnit = (i, round = 1) => {
    setUnitIdx(i);
    setRoundNo(round);
    setPair(0);
    setElapsed(0);
    setRunning(false);
    if (isRally) {
      scoreRef.current = 0;
      setScore(0);
      setCur(UNIT.makeRound());
      setRemaining(duration * 1000);
    } else {
      setRounds(UNIT.buildRounds(players));
    }
    setScreen('play');
  };

  const startTimer = () => {
    t0.current = performance.now();
    setRunning(true);
  };

  const finishAttack = () => {
    if (!running) return;
    const final = performance.now() - t0.current;
    setRunning(false);
    setElapsed(final);
    setResults((r) => [...r, { unit: unitIdx, roundNo, value: final, rounds }]);
    setScreen('finish');
    sound.play('celebration');
  };

  const endRally = () => {
    setRunning(false);
    setResults((r) => [...r, { unit: unitIdx, roundNo, value: scoreRef.current }]);
    setScreen('finish');
    sound.play('celebration');
  };

  const nextRally = () => {
    if (!running) return;
    scoreRef.current += 1;
    setScore(scoreRef.current);
    setCur((c) => UNIT.makeRound(c.item.id));
  };

  const nextUnit = () => (unitIdx + 1 < units ? startUnit(unitIdx + 1) : setScreen('scores'));

  const backToSettings = () => {
    setRunning(false);
    setElapsed(0);
    setResults([]);
    setScreen(setupScreen);
  };

  const chooseMode = (m) => {
    setMode(m);
    setScreen(m === 'rally' ? 'rallySetup' : 'setup');
  };

  /* ---------- mode select ---------- */
  if (screen === 'modes') {
    return (
      <div className="setup-screen">
        <div className="app-header">
          <h1 className="brand-name">{UNIT.title}</h1>
          <span />
          <div className="topbar-right">
            <SoundBtn sfxOn={sfxOn} toggleSfx={toggleSfx} />
            <a className="nav-btn back-home-btn" href="https://dmnfang.github.io">Home</a>
            <FullscreenBtn />
          </div>
        </div>
        <div className="modes-body">
          <button className="mode-card is-attack" data-sound="modalOpen" onClick={() => chooseMode('attack')}>
            <span className="mode-icon attack">⏱️</span>
            <span className="mode-name">Time Attack</span>
            <span className="mode-desc">Race through the whole conversation chain as fast as you can.</span>
          </button>
          <button className="mode-card is-rally" data-sound="modalOpen" onClick={() => chooseMode('rally')}>
            <span className="mode-icon rally">🎾</span>
            <span className="mode-name">Rally</span>
            <span className="mode-desc">How many Q&amp;As can you finish before the clock runs out?</span>
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Time Attack settings ---------- */
  if (screen === 'setup') {
    return (
      <div className="setup-screen">
        <div className="app-header">
          <h1 className="brand-name">Time Attack</h1>
          <span />
          <div className="topbar-right">
            <SoundBtn sfxOn={sfxOn} toggleSfx={toggleSfx} />
            <button className="topbar-action secondary" data-sound="close" onClick={() => setScreen('modes')}>Home</button>
            <FullscreenBtn />
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
              {teamCount === 1 && <RoundsBlock value={attackLimit} onChange={setAttackLimit} />}
              <Block label="Players per Team">
                {PLAYER_OPTIONS.map((n) => (
                  <Pill key={n} active={players === n} onClick={() => setPlayers(n)}>{n}</Pill>
                ))}
              </Block>
            </div>
            <StartBtn loaded={imagesLoaded} onStart={() => startUnit(0)} />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Rally settings ---------- */
  if (screen === 'rallySetup') {
    return (
      <div className="setup-screen">
        <div className="app-header">
          <h1 className="brand-name">Rally</h1>
          <span />
          <div className="topbar-right">
            <SoundBtn sfxOn={sfxOn} toggleSfx={toggleSfx} />
            <button className="topbar-action secondary" data-sound="close" onClick={() => setScreen('modes')}>Home</button>
            <FullscreenBtn />
          </div>
        </div>
        <div className="setup-body">
          <div className="setup-panel">
            <div className="panel-title">Rally Settings</div>
            <div className="settings-scroll">
              <Block label="Who plays">
                {FORMATS.map(([id, label]) => (
                  <Pill key={id} active={format === id} onClick={() => setFormat(id)}>{label}</Pill>
                ))}
              </Block>
              {format === 'pairs' && (
                <Block label="Number of Pairs">
                  {PAIR_OPTIONS.map((n) => (
                    <Pill key={n} active={pairCount === n} onClick={() => setPairCount(n)}>{n}</Pill>
                  ))}
                </Block>
              )}
              {format === 'groups' && (
                <Block label="Number of Groups">
                  {GROUP_OPTIONS.map((n) => (
                    <Pill key={n} active={groupCount === n} onClick={() => setGroupCount(n)}>{n}</Pill>
                  ))}
                </Block>
              )}
              <Block label="Time on the Clock">
                {DURATIONS.map(([sec, label]) => (
                  <Pill key={sec} active={duration === sec} onClick={() => setDuration(sec)}>{label}</Pill>
                ))}
              </Block>
              {solo && <RoundsBlock value={rallyLimit} onChange={setRallyLimit} />}
            </div>
            <StartBtn loaded={imagesLoaded} onStart={() => startUnit(0)} />
          </div>
        </div>
      </div>
    );
  }

  /* ---------- play ---------- */
  if (screen === 'play') {
    const r = isRally ? cur : rounds[pair];
    const lastAttack = !isRally && pair === players - 1;
    let askLabel;
    let replyLabel;
    if (isRally) {
      const flip = score % 2 === 1; // roles swap after every Q&A
      askLabel = flip ? 'B' : 'A';
      replyLabel = flip ? 'A' : 'B';
    } else {
      askLabel = pair + 1;
      replyLabel = lastAttack ? 1 : pair + 2;
    }
    const lines = UNIT.dialogue(r);
    const Visual = UNIT.Visual;
    const showUnit = isRally && !solo; // big "Pair 3 of 8" / "Group 2 of 4" label above the conversation

    return (
      <>
        <div className="topbar">
          <div className="title">{title}</div>
          {!isRally ? <Pips total={players} current={pair} /> : solo ? <span /> : <Pips total={units} current={unitIdx} />}
          <div className="topbar-right">
            {!running && (
              <button className="topbar-action" data-sound="launch" onClick={startTimer}>Start timer</button>
            )}
            <SettingsBtn onConfirm={backToSettings} />
            <FullscreenBtn />
          </div>
        </div>

        <div className="body">
          <div className={`script-panel ${showUnit ? 'labeled' : ''}`}>
            {showUnit && (
              <div className="unit-chip">{unitLabel} {unitIdx + 1} <span>of {units}</span></div>
            )}
            {lines.map(([role, text], i) => (
              <div key={i} className="line">
                <div className={`avatar ${role}`}>{role === 'asker' ? askLabel : replyLabel}</div>
                <p className="say">{text}</p>
              </div>
            ))}
          </div>
          <div className="item-panel">
            <div className="menu-card">
              <div className="pic"><Visual round={r} /></div>
            </div>
          </div>
        </div>

        <div className="go-bar">
          <div className="timer-box">{isRally ? fmtCount(remaining) : fmt(elapsed)}</div>
          {isRally && (
            <div className="timer-box score-box" aria-label="Points">
              <span key={score}>{score}</span>
            </div>
          )}
          {isRally ? (
            <button className="big-btn" data-sound="nextCard" disabled={!running} onClick={nextRally}>Next</button>
          ) : lastAttack ? (
            <button className="big-btn finish" data-sound="none" disabled={!running} onClick={finishAttack}>Finish</button>
          ) : (
            <button className="big-btn" data-sound="nextCard" disabled={!running} onClick={() => setPair(pair + 1)}>Next</button>
          )}
        </div>
      </>
    );
  }

  /* ---------- finish ---------- */
  if (screen === 'finish') {
    const last = results[results.length - 1];
    const isLast = unitIdx + 1 >= units;
    const atLimit = limit !== 'open' && roundNo >= limit;
    return (
      <>
        <div className="topbar">
          <div className="title">{title}</div>
          {!isRally ? (
            <Pips total={players} current={players} allDone />
          ) : solo ? (
            <span />
          ) : (
            <Pips total={units} current={-1} doneCount={unitIdx + 1} />
          )}
          <div className="topbar-right">
            <SettingsBtn onConfirm={backToSettings} />
            <FullscreenBtn />
          </div>
        </div>
        <div className="body">
          <div className="collage-panel">
            {isRally ? (
              <>
                <div className="wow">Time's up!</div>
                <div className="final-time">{last.value}</div>
                <div className="unit-label">{last.value === 1 ? 'point' : 'points'}</div>
              </>
            ) : (
              <>
                <div className="wow">Wow, nice salad!</div>
                <div className="final-time">{fmt(last.value)}</div>
                <Collage rounds={last.rounds} />
              </>
            )}
          </div>
        </div>
        <div className="go-bar">
          {solo && !atLimit ? (
            <>
              <button className="big-btn" data-sound="modalOpen" onClick={() => startUnit(0, roundNo + 1)}>Revenge round</button>
              <button className="big-btn secondary" data-sound="targetSelect" onClick={() => setScreen('scores')}>End game</button>
            </>
          ) : (
            <button className="big-btn" data-sound={isLast ? 'targetSelect' : 'modalOpen'} onClick={nextUnit}>
              {isLast ? 'Display scores' : `Start next ${unitLabel.toLowerCase()}`}
            </button>
          )}
        </div>
      </>
    );
  }

  /* ---------- scoreboard ---------- */
  const higherIsBetter = isRally;
  const show = (v) => (isRally ? `${v} pts` : fmt(v));
  const ranked = solo
    ? results
    : [...results].sort((x, y) => (higherIsBetter ? y.value - x.value : x.value - y.value));
  const values = results.map((r) => r.value);
  const best = higherIsBetter ? Math.max(...values) : Math.min(...values);
  return (
    <>
      <div className="topbar">
        <div className="title">Scoreboard</div>
        <span />
        <div className="topbar-right">
          <SettingsBtn onConfirm={backToSettings} />
          <FullscreenBtn />
        </div>
      </div>
      <div className="body">
        <ol className="score-list">
          {ranked.map((r, i) =>
            solo ? (
              <li key={r.roundNo} className={`score-row solo ${r.value === best ? 'fastest' : ''}`}>
                <span>Round {r.roundNo}</span>
                <span className="score-time">{show(r.value)}</span>
              </li>
            ) : (
              <li key={r.unit} className={`score-row ${i === 0 ? 'first' : ''}`}>
                <span className="rank">{i + 1}</span>
                <span>{unitLabel} {r.unit + 1}</span>
                <span className="score-time">{show(r.value)}</span>
              </li>
            )
          )}
        </ol>
      </div>
    </>
  );
}
