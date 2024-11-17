# min-rts
A minimalist mathematical Real-Time-Strategy game in your browser. More formally: a deterministic discrete symmetric zero-sum simultaneous multi-player competitive game.
![Screenshot of a Min-RTS game.](/assets/images/MIN-RTS.png)

# WHAT IS THIS GAME ABOUT?
Min-RTS is not really meant for human play, but for training AIs and looking into the minimal conditions under which a model starts to learn common strategies. The questions I want to answer are:
- under which vision rules will the model learn to scout and to ambush?
- under which movement rules will the model learn to choke and to funnel?
- under which gathering rules will the model learn to creep and to expand?
- under which engagement rules will the model learn to harass and to flank?

For that reason, the game is founded upon some desiderata:
- the players take control of individual units on a finite map
- gameplay is based on local repositioning of the units
- time is elapsing in a discrete way rather than continuously
- players lack complete/perfect knowledge about their opponents
- options / features / possible actions must be as minimum as possible
- rules must be deterministic and fair.

Surprisingly, there are very compelling consequences when the desiderata are fulfilled thoroughly:
- minimality enforces a 2D discrete map with finite degrees of freedom in movement
    - an hexagonal board can visually accomodate from 3 to 6 degrees of freedom (depending on the number of "holes" you choose to include in the board)
    - an hexagonal board can also host up to three opposing players, all equidistant from each other
    - the board is finite but it does not have borders: in that way, only local positioning matters
    - homogeneity, isotropy, and achirality are enforced so that the AI models cannot exploit the coordinate system to gain hidden knowledge
        - in particular, that means that the board's coordinates are modelled as a finite normed vector space
- minimality also enforces that units can be lost or acquired by means of local repositioning only
    - units are not allowed to stack together in a single place: in that way, tactical positioning becomes a necessary skill to train
    - individual units can be moved separately, but each can only perform a single step per round
    - you can capture new units by attempting to reposition into their current position, as long as they don't move away in the meanwhile
    - to ensure fairness, the rule applies to enemy units or friendly units alike. That means that you can "defend" a friendly unit from being captured by attempting to reposition into it
- incomplete knowledge means that each player needs to understand the "intentions" of the others
    - visibility is limited by a constant fog of war. Each unit can see around itself, and its field of view is equivalent to two steps
    - when you meet a non-friendly unit, there is no tell whether such unit is neutral (thus it can be easily captured) or it already belongs to someone
    - neutral units act as a form of resource to gather. Neutral units can stand still or move around, but they won't act in a coordinated way
- to ensure fairness, the game is round-based rather than turn-based
    - each player chooses all its actions for the next round, without knowing which actions are being decided by other players
    - the game engine resolves all the chosen actions and decides which ones will be fulfilled and which ones will be denied
    - tactical denying becomes a necessary skill to have in order to disrupt the intentions of the opposing players
    - the game is lost when you lose all your units; the game is won when you capture all the units in the map.

# HOW DO YOU IMPLEMENT ALL THAT?
- the game board is composed by individual cells, and each cell has its own pair of global coordinates
- from the point of view of each computer-controlled player, the starting cell has local coordinates (0,0)
- cells are usually disposed in an hexagonal shape, but a few more shapes are available (square and rhombus)
- hexagonal boards are split into six hidden sextants (similarly, square boards are split into four quadrants)
- the shape of the board is purely visual: what really matters are the degrees-of-freedom in movement
- the degrees-of-freedom in movement are either 3, 4, 5, or 6. In such cases, each cell will be adjacent to some holes (respectively 3, 2, 1, or 0)
- the borders of the map are coloured in purple but they do not represent actual borders since crossing units will be teleported on the other side
- each cell can host up to one unit, and each unit has an individual name and (possibly) an owner
- passive units at the start of each game can be located randomly (casual), equidistributed (uniform), or symmetrically (snowflake aka the default)
- opposing players at the start of each game are located as distant as possible from each other
- computer-controlled players can be passive, fugitive, solitary, retiring, defensive, aggressive, hunters, marching, or drunkards
- by default, you play against two computer-controlled players: a fugitive and an aggressive. Passive units are drunkards
- by default, the map is hexagonal with side-length = 9 and degrees-of-freedom = 6
- click on each of your units and decide which direction it should move to at the next round
- once a direction is chosen, the unit will keep moving in that direction for good (but you can stop it anytime).

# HOW DO I INSTALL IT?
- To install the game, just clone this repository and open the file index.html with a browser
- only Chrome is supported at the moment
- by default, the game is on pause. Click on the button "Play / Pause ⏯" to start the game
- minimal statistics about the game are shown at all time as below:
    - Stats: you own 1 total piece(s) out of 37
    - 1 second(s) elapsed
- press H to manully move the time forward by one second, even when the game is on pause
- click on the button "How To Play" to see additional instructions.

# BASIC INSTRUCTIONS
To win the game, use your light-blue pieces to capture all the enemy orange pieces. Each piece has its own unique name and field-of-view.
- First step: select some pieces of yours by dragging a box on the map. The selected pieces will become blue
- Second step: right-click anywhere on the map to set a direction. An arrow will appear above the selected pieces
- Right-click on some enemy piece to chase it: the attacked enemy piece will become red. Beware: the enemy piece may decide to flee or to counter-attack.

# ADVANCED INSTRUCTIONS
- If you right-click a friendly or enemy piece on the map, your selected pieces will start following it
- When an action is not realizable for some reason, the faulty pieces will get blocked and will flicker briefly
- Use CTRL and your mouse to select/deselect multiple pieces. Use CTRL+A to select all your pieces at once
    - BUG: CTRL+A seems to be broken sometimes
- Use the arrow keys of your keyboard to rotate (clockwise / anti-clockwise) the direction of your selected pieces
- The map does not have borders: when some piece reaches an end, it is immediately teleported to the opposite side

# REMARKS
- the color palette is color-blind friendly
- each individual unit has a (random but distinct) name to easily identify it
- units flicker a little when their actions are blocked or when they are captured by other players
- CSS3 animations are used to help the visualization of all unit's movements
- however, such animation can sometimes "leak" information to human players about the past actions of their opponents.

# FUTURE WORK
This repo contains work in progress, and it may or may not be further expanded in the future. I plan someday to rewrite the rule engine in Python, train a Recurrent Neural Network, record each game in JSON format, and replay the match in the browser. There are no plans for a commercial version of this game.

# WHO I AM
My name is Gianluca Calcagni, born in Italy, with a Master of Science in Mathematics. I am currently (2025) working in IT as a consultant with the role of Salesforce Certified Technical Architect. My opinions do not reflect the opinions of my employer or my customers. Feel free to contact me on [Twitter](https://x.com/gclazio) or [Linkedin](https://www.linkedin.com/in/gianluca-calcagni-72a91950/).