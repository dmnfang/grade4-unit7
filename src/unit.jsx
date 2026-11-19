import { ItemGrid } from './Item.jsx';
import { buildRounds, makeRound } from './data.js';

// Everything that is specific to this unit (Grade 4, Unit 7: "What do you want?").
// To reuse the app for another grammar point, swap this file (plus the items/images in data.js).
export const UNIT = {
  title: 'What do you want?',

  // Time Attack: one round per player in the chain. Rally: one round at a time, forever.
  buildRounds,
  makeRound,

  // The conversation. role is 'asker' or 'replier'; <span className="picked"> highlights keywords.
  dialogue: (r) => [
    ['asker', <>What do you want?</>],
    ['replier', <>I want <span className="picked">{r.item.name}</span>, please.</>],
    ['asker', <>How many?</>],
    ['replier', <><span className="picked">{r.qty}</span>, please.</>],
    ['asker', <>Here you are.</>],
    ['replier', <>Thank you.</>],
  ],

  // The picture shown beside the conversation.
  Visual: ({ round }) => <ItemGrid item={round.item} qty={round.qty} />,
};
