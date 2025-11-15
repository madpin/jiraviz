export const LOADING_JOKES = [
  'Why do programmers prefer dark mode? Because light attracts bugs!',
  'Why did the developer go broke? Because they used up all their cache!',
  'How many programmers does it take to change a light bulb? None. It\'s a hardware problem!',
  'Why do Java developers wear glasses? Because they can\'t C#!',
  'What\'s a programmer\'s favorite hangout place? Foo Bar!',
  'Why was the JavaScript developer sad? Because they didn\'t Node how to Express themselves!',
  'What do you call a programmer from Finland? Nerdic!',
  'Why do programmers always mix up Halloween and Christmas? Because Oct 31 == Dec 25!',
  'What\'s the object-oriented way to become wealthy? Inheritance!',
  'Why did the database administrator leave their spouse? They had one-to-many relationships!',
  'A SQL query walks into a bar, walks up to two tables and asks... \'Can I JOIN you?\'',
  'Why do Python programmers have low self-esteem? Because they\'re constantly comparing self to others!',
  'What did the router say to the doctor? It hurts when IP!',
  'Why don\'t backers make good comedians? They work better in a private repository!',
  'What\'s a computer\'s favorite snack? Microchips!',
];

export function getRandomJoke(): string {
  return LOADING_JOKES[Math.floor(Math.random() * LOADING_JOKES.length)];
}

