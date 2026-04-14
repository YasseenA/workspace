export interface School {
  name: string;
  shortName: string;
  canvasUrl: string;
  location: string;
  emoji: string;
}

export const SCHOOLS: School[] = [
  // Washington State
  { name: 'University of Washington',         shortName: 'UW Seattle',   canvasUrl: 'https://canvas.uw.edu',                    location: 'Seattle, WA',      emoji: '🐾' },
  { name: 'UW Bothell',                        shortName: 'UW Bothell',   canvasUrl: 'https://canvas.uwb.edu',                   location: 'Bothell, WA',      emoji: '🐾' },
  { name: 'UW Tacoma',                         shortName: 'UW Tacoma',    canvasUrl: 'https://canvas.uwt.edu',                   location: 'Tacoma, WA',       emoji: '🐾' },
  { name: 'Washington State University',       shortName: 'WSU',          canvasUrl: 'https://canvas.wsu.edu',                   location: 'Pullman, WA',      emoji: '🐻' },
  { name: 'Western Washington University',     shortName: 'WWU',          canvasUrl: 'https://canvas.wwu.edu',                   location: 'Bellingham, WA',   emoji: '🦅' },
  { name: 'Central Washington University',     shortName: 'CWU',          canvasUrl: 'https://canvas.cwu.edu',                   location: 'Ellensburg, WA',   emoji: '🦅' },
  { name: 'Eastern Washington University',     shortName: 'EWU',          canvasUrl: 'https://canvas.ewu.edu',                   location: 'Cheney, WA',       emoji: '🦅' },
  { name: 'Seattle University',                shortName: 'Seattle U',    canvasUrl: 'https://canvas.seattleu.edu',              location: 'Seattle, WA',      emoji: '⚓' },
  { name: 'Bellevue College',                  shortName: 'BC',           canvasUrl: 'https://canvas.bellevuecollege.edu',       location: 'Bellevue, WA',     emoji: '🏫' },
  { name: 'Seattle Central College',           shortName: 'SCC',          canvasUrl: 'https://seattlecentral.instructure.com',   location: 'Seattle, WA',      emoji: '🏫' },
  { name: 'North Seattle College',             shortName: 'NSC',          canvasUrl: 'https://northseattle.instructure.com',     location: 'Seattle, WA',      emoji: '🏫' },
  { name: 'South Seattle College',             shortName: 'SSC',          canvasUrl: 'https://southseattle.instructure.com',     location: 'Seattle, WA',      emoji: '🏫' },
  { name: 'Shoreline Community College',       shortName: 'Shoreline',    canvasUrl: 'https://shoreline.instructure.com',        location: 'Shoreline, WA',    emoji: '🏫' },
  { name: 'Edmonds College',                   shortName: 'Edmonds',      canvasUrl: 'https://edmonds.instructure.com',          location: 'Lynnwood, WA',     emoji: '🏫' },
  { name: 'Green River College',               shortName: 'Green River',  canvasUrl: 'https://greenriver.instructure.com',       location: 'Auburn, WA',       emoji: '🏫' },
  { name: 'Cascadia College',                  shortName: 'Cascadia',     canvasUrl: 'https://cascadia.instructure.com',         location: 'Bothell, WA',      emoji: '🏫' },
  { name: 'Highline College',                  shortName: 'Highline',     canvasUrl: 'https://highline.instructure.com',         location: 'Des Moines, WA',   emoji: '🏫' },
  { name: 'Pierce College',                    shortName: 'Pierce',       canvasUrl: 'https://pierce.instructure.com',           location: 'Lakewood, WA',     emoji: '🏫' },

  // Oregon
  { name: 'University of Oregon',              shortName: 'UO',           canvasUrl: 'https://canvas.uoregon.edu',               location: 'Eugene, OR',       emoji: '🦆' },
  { name: 'Oregon State University',           shortName: 'OSU',          canvasUrl: 'https://canvas.oregonstate.edu',           location: 'Corvallis, OR',    emoji: '🦫' },
  { name: 'Portland State University',         shortName: 'PSU',          canvasUrl: 'https://canvas.pdx.edu',                  location: 'Portland, OR',     emoji: '🦉' },

  // California
  { name: 'UCLA',                              shortName: 'UCLA',         canvasUrl: 'https://bruinlearn.ucla.edu',              location: 'Los Angeles, CA',  emoji: '🐻' },
  { name: 'UC Berkeley',                       shortName: 'UC Berkeley',  canvasUrl: 'https://bcourses.berkeley.edu',            location: 'Berkeley, CA',     emoji: '🐻' },
  { name: 'UC San Diego',                      shortName: 'UCSD',         canvasUrl: 'https://canvas.ucsd.edu',                  location: 'San Diego, CA',    emoji: '🔱' },
  { name: 'UC Davis',                          shortName: 'UC Davis',     canvasUrl: 'https://canvas.ucdavis.edu',               location: 'Davis, CA',        emoji: '🐄' },
  { name: 'UC Irvine',                         shortName: 'UCI',          canvasUrl: 'https://canvas.eee.uci.edu',               location: 'Irvine, CA',       emoji: '🦅' },
  { name: 'Stanford University',               shortName: 'Stanford',     canvasUrl: 'https://canvas.stanford.edu',              location: 'Stanford, CA',     emoji: '🌲' },
  { name: 'USC',                               shortName: 'USC',          canvasUrl: 'https://usc.instructure.com',              location: 'Los Angeles, CA',  emoji: '✌️' },
  { name: 'San Jose State University',         shortName: 'SJSU',         canvasUrl: 'https://sjsu.instructure.com',             location: 'San Jose, CA',     emoji: '🏫' },

  // Other Popular
  { name: 'Arizona State University',          shortName: 'ASU',          canvasUrl: 'https://canvas.asu.edu',                   location: 'Tempe, AZ',        emoji: '😈' },
  { name: 'University of Arizona',             shortName: 'UA',           canvasUrl: 'https://canvas.arizona.edu',               location: 'Tucson, AZ',       emoji: '🐻' },
  { name: 'Georgia Tech',                      shortName: 'GT',           canvasUrl: 'https://canvas.gatech.edu',                location: 'Atlanta, GA',      emoji: '🐝' },
  { name: 'University of Michigan',            shortName: 'UMich',        canvasUrl: 'https://umich.instructure.com',            location: 'Ann Arbor, MI',    emoji: '🐻' },
  { name: 'Ohio State University',             shortName: 'OSU',          canvasUrl: 'https://osu.instructure.com',              location: 'Columbus, OH',     emoji: '🌰' },
  { name: 'NYU',                               shortName: 'NYU',          canvasUrl: 'https://nyu.instructure.com',              location: 'New York, NY',     emoji: '🗽' },
  { name: 'Columbia University',               shortName: 'Columbia',     canvasUrl: 'https://courseworks2.columbia.edu',        location: 'New York, NY',     emoji: '🦁' },
  { name: 'Harvard University',                shortName: 'Harvard',      canvasUrl: 'https://canvas.harvard.edu',               location: 'Cambridge, MA',    emoji: '🎓' },
  { name: 'MIT',                               shortName: 'MIT',          canvasUrl: 'https://canvas.mit.edu',                   location: 'Cambridge, MA',    emoji: '🔬' },
  { name: 'University of Texas Austin',        shortName: 'UT Austin',    canvasUrl: 'https://utexas.instructure.com',           location: 'Austin, TX',       emoji: '🤘' },
  { name: 'University of Florida',             shortName: 'UF',           canvasUrl: 'https://ufl.instructure.com',              location: 'Gainesville, FL',  emoji: '🐊' },
  { name: 'Penn State',                        shortName: 'Penn State',   canvasUrl: 'https://psu.instructure.com',              location: 'State College, PA',emoji: '🦁' },
  { name: 'University of Illinois',            shortName: 'UIUC',         canvasUrl: 'https://canvas.illinois.edu',              location: 'Champaign, IL',    emoji: '🌽' },
  { name: 'Purdue University',                 shortName: 'Purdue',       canvasUrl: 'https://purdue.instructure.com',           location: 'West Lafayette, IN',emoji:'🚂' },
  { name: 'University of Wisconsin',           shortName: 'UW-Madison',   canvasUrl: 'https://canvas.wisc.edu',                  location: 'Madison, WI',      emoji: '🦡' },
  { name: 'University of Minnesota',           shortName: 'UMN',          canvasUrl: 'https://canvas.umn.edu',                   location: 'Minneapolis, MN',  emoji: '🐿️' },
  { name: 'Indiana University',                shortName: 'IU',           canvasUrl: 'https://iu.instructure.com',               location: 'Bloomington, IN',  emoji: '🔴' },
];

export function findSchool(query: string): School[] {
  const q = query.toLowerCase().trim();
  if (!q) return SCHOOLS;
  return SCHOOLS.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.shortName.toLowerCase().includes(q) ||
    s.location.toLowerCase().includes(q)
  );
}
