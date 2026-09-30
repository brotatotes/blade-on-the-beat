// Story text shown between nights. Copied from SCRIPT.md.
// A card is a string, or { letter: [lines], sign } for a letter,
// or { speaker, text } for dialogue.

const say = (speaker, text) => ({ speaker, text });
const letter = (lines, sign, from, to = 'Ren,') => ({ letter: lines, sign, from, to });

export const OPENING = [
  'Above the village of Emberfall there is one road through the mountains, and one gate across it.',
  'Ren has kept Kestrel Gate for three winters. Nobody has come through in all that time.',
  'Tonight she hears drums in the north. She knows the rhythm. She learned it as a girl, in the camp of the Iron Choir.',
  'The Iron Choir fights to music. Every blow has its beat. A soldier who knows the song can meet each one.',
  say('Ren', 'Then I will learn their song again.'),
  'Watch the wind-up. Strike when it lands.',
];

export const BEFORE = {
  1: ['Two scouts test the gate.'],
  2: [
    'Hadd the Drummer carries a war drum as tall as a door. His army marches to it, and so will his blows.',
    'He hits hard, and he hits between the beats.',
  ],
  3: [
    'Sif and Sela never miss, and they never shoot together. One calls, the other answers.',
    'Listen for the side. The left bow sings low. The right bow sings high.',
  ],
  4: [
    'No champion tonight. Torch-bearers run for the wall to set Emberfall alight while Ren is busy at the gate.',
    'The torches aim past her, at the village. Stop every one you can.',
  ],
  5: [
    'The Dancer moves like a song played slightly late. The Choir says no one has ever found the beat under the mask.',
    'Feel the swing. Wait for the long note.',
  ],
  6: [
    'The Choir brings a ram of black pine. Its crew swings in threes while the ram strikes in twos.',
    'Every blow on the gate shakes the village below it.',
  ],
  7: [
    'He comes alone, as she asked. He is thinner than she remembers.',
    say('Aldric', 'You kept the gate well.'),
    say('Ren', 'You taught me.'),
    say('Aldric', 'Then you know I will not make this easy.'),
    'He uses every rhythm his army played. Some of his wind-ups are lies. A pale blade is a feint. Do not answer it.',
  ],
};

export const AFTER = {
  1: [
    'The scouts run back into the dark. One drops a satchel. Inside is a crust of bread, black with mould, carried like treasure.',
    say('Ren', 'Nobody carries bread like that unless they are starving.'),
    letter([
      'They tell me a swordswoman holds Kestrel Gate. They tell me she parries on the beat and never on the count before. I taught only one student to wait like that.',
      'Stand aside. I do not want to meet you on the road.',
    ], 'A.', 'Found in the satchel'),
  ],
  2: [
    'The great drum splits. Hadd sits down in the snow and laughs until he coughs.',
    say('Hadd', 'Aldric said you would do that. He was proud of it, girl. He still is.'),
    say('Ren', 'Then why is he coming?'),
    say('Hadd', 'Ask him what we ate this winter.'),
    letter([
      'The rivers froze in the ninth month. The herds died in the tenth. We have buried more children than soldiers.',
      'Emberfall has a granary. I have an army that is hungry. I wish those two facts did not meet at your gate.',
    ], 'Aldric', 'Pinned to the gate with a drumstick'),
  ],
  3: [
    'The twins lower their bows at the same moment. It is the first thing they have done together all night.',
    say('Sela', 'Our mother is in the camp. She has not stood up in a week.'),
    'Ren gives them her own rations and sends them north before dawn.',
    letter([
      'We saw the arrows from the square. The children are asking if the Choir is coming down. What should I tell them?',
    ], 'Maren, headwoman of Emberfall', 'Word from the village', 'Keeper,'),
  ],
  4: [
    'Smoke hangs over the rooftops until morning. Maren climbs the road with a bucket still in her hand.',
    say('Maren', 'We put the fires out. Some of them.'),
    say('Ren', 'They are not cruel. They are hungry.'),
    say('Maren', 'Hungry people burned my neighbour\u2019s roof, Ren.'),
    'Neither of them is wrong.',
  ],
  5: [
    'The mask falls. Underneath is Iyo, who shared Ren\u2019s tent when they were both children in the camp.',
    say('Iyo', 'You left. We stayed. That is the whole difference between us.'),
    say('Ren', 'Stay here, then. With me.'),
    'Iyo looks at the lights of Emberfall for a long moment, then walks north.',
    letter([
      'You always asked why I made you wait for the beat instead of swinging first. It is because the one who waits sees everything. I am asking you to see my people now.',
      'Two more nights. Then I come myself.',
    ], 'Aldric', 'Left in the snow'),
  ],
  6: [
    'The ram cracks and rolls back down the road. Its crew does not chase it.',
    'Ren writes a letter of her own, and leaves it where the scouts will find it.',
    letter([
      'Come to the gate tomorrow, alone if you can. Whatever happens, I will not swing first.',
    ], 'Ren', 'Left for the scouts', 'Teacher,'),
  ],
  7: [],
};

export const ENDINGS = {
  granary: {
    title: 'The Open Granary',
    cards: [
      'Aldric\u2019s sword stops a finger\u2019s width from her shoulder. Hers stops at his.',
      'Behind them, Emberfall is still lit. Maren is walking up the road with a lantern, and behind her come carts.',
      say('Maren', 'We have more grain than a village this size can eat. Nobody has ever asked us for it.'),
      say('Aldric', 'I did not ask. I came with a sword.'),
      say('Ren', 'Then ask now.'),
      'He lowers his blade.',
      'That winter the gate stays open. The Iron Choir comes down the mountain singing, and nobody in Emberfall needs to fear the drums again.',
    ],
  },
  north: {
    title: 'The Long Road North',
    cards: [
      'Aldric falls to one knee. Ren does not strike.',
      'Below them, half of Emberfall is ash. The granary roof has fallen in.',
      say('Aldric', 'There is nothing left to take. Or to give.'),
      say('Ren', 'I held the gate. I could not hold the village.'),
      'He stands, bows to his student, and walks north with the little the villagers can spare.',
      'In spring, Ren rebuilds the wall and sends seed north. She does not know if anyone is there to plant it.',
    ],
  },
};

export const DEFEAT = 'Ren falls. The drums keep playing.';

export const NIGHT_TITLES = {
  1: 'Scouts', 2: 'The Drummer', 3: 'The Twin Archers', 4: 'The Night Raid',
  5: 'The Masked Dancer', 6: 'The Ram', 7: 'Aldric',
};
