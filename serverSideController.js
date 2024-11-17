"use strict";



// CLASSES //

class Piece { // A piece represents one of the units //
    // INSTANCE VARIABLES //
    parentGame; // reference to the parent game
    parentMap;  // reference to the map of the game
    currentPlayer; // the player that is currently owning this unit
    previousPlayer; // the last player that previosly owned this unit
    currentCell; // the cell currently occupied by this unit
    previousCell; // the cell previously occupied by this unit
    id; // ID of this unit. Automatically assigned
    currentIntent; // the current intent of this unit
    previousIntent; // this shows either the previous intent of the cell or the inherited intent after a unit conversion
    intentHistory = []; // the history of intents of this unit
    convertedByIntent; // the last intent whose outcome was to convert this unit to the current player
    #selectableCellsMap; // the temporary map from the ID of a cell to some cell. It encloses all the cells that are currently selectable by this unit
    #visibleCellsMap; // the temporary map from the ID of a cell to some cell. It encloses all the cells that are currently visible by this unit

    // CONSTRUCTOR //
    constructor( game, player, cell ) {
        console.assert( game && player && cell, "Null argument found on constructor", game, player, cell );
        console.assert( !cell.currentUnit, "The cell is occupied by a unit already", game, player, cell );
        console.assert( !cell.isHole, "The cell occupied by the unit is a hole", game, player, cell );
        this.parentGame = game;
        this.parentMap = game.map;
        this.currentPlayer = player;
        this.currentCell = cell;
        this.currentCell.setCurrentUnit( this );
        this.id = game.getFreshRandomName();
    }

    // METHODS //
    setTargetIntent( cell ) { // Sets an intent on this unit to target a cell. Any previous intent on this unit for the current round is overwritten //
        console.assert( cell, "Null argument found on method", this, cell );
        let intent = new Intent( this, cell );
        this.parentGame.addIntent( intent );
    }
    setHoldIntent() { // Sets a hold intent on this unit. Any previous intent on this unit for the current round is overwritten //
        let intent = new Intent( this, this.currentCell );
        this.parentGame.addIntent( intent );
    }
    setRandomIntent() { // Sets a random intent on this unit. Any previous intent on this unit for the current round is overwritten //
        let selectableCellsMap = this.getSelectableCellsMap();
        let selectableCellIdsArray = Object.keys( selectableCellsMap );
        let randomIndex = Math.floor( Math.random()*selectableCellIdsArray.length );
        let randomSelectableCellId = selectableCellIdsArray[ randomIndex ]
        let randomSelectableCell = selectableCellsMap[ randomSelectableCellId ];
        let intent = new Intent( this, randomSelectableCell );
        this.parentGame.addIntent( intent );
    }
    getSelectableCellsMap() { // Gets the map from the ID of a cell to some cell. It encloses all the cells that are currently selectable by this unit //
        if ( !this.#selectableCellsMap ) {
            this.#selectableCellsMap = {};
            let thisUnit = this;
            this.currentCell.getAdjacentCells().forEach(
                function( adjacentCell, index ) {
                    if ( !adjacentCell.isHole ) {
                        thisUnit.#selectableCellsMap[ adjacentCell.id ] = adjacentCell;
                    }
                }
            );
        }
        return this.#selectableCellsMap;
    }
    getVisibleCellsMap() { // Gets the map from the ID of a cell to some cell. It encloses all the cells that are currently visible by this unit //
        if ( !this.#visibleCellsMap ) {
            this.#visibleCellsMap = {};
            let thisUnit = this;
            this.currentCell.getAdjacentCells().forEach(
                function( adjacentCell, index ) {
                    if ( !adjacentCell.isHole ) {
                        thisUnit.#visibleCellsMap[ adjacentCell.id ] = adjacentCell;
                        adjacentCell.visitingPlayers[ thisUnit.currentPlayer.id ] = true;
                        adjacentCell.getAdjacentCells().forEach(
                            function( otherAdjacentCell, otherIndex ) {
                                if ( !otherAdjacentCell.isHole ) {
                                    thisUnit.#visibleCellsMap[ otherAdjacentCell.id ] = otherAdjacentCell;
                                    otherAdjacentCell.visitingPlayers[ thisUnit.currentPlayer.id ] = true;
                                }
                            }
                        );
                    }
                }
            );
        }
        return this.#visibleCellsMap;
    }
    resetVisibility() { // Resets the selectable and the visible cells. This is only necessary at the start of a new round //
        this.#selectableCellsMap = null;
        this.#visibleCellsMap = null;
    }
    getClosestSelectableCell( targetCell ) { // Gets a selectable cell that is the closest to the given target cell //
        console.assert( targetCell && targetCell.id, "Null argument found on method", this, targetCell );
        let closestSelectableCell = this.currentCell;
        if ( closestSelectableCell.id !== targetCell.id) {
            let targetSextant = this.currentCell.getSextantOf( targetCell ), selectableCellsMap = this.getSelectableCellsMap();
            let minDistance = this.parentMap.diameter + 1, minTurnsNumber = 6;
            for ( let selectableCellId in selectableCellsMap ) {
                let selectableCell = selectableCellsMap[ selectableCellId ];
                let distance = targetCell.distanceFrom( selectableCell );
                let selectableCellSextant = this.currentCell.getSextantOf( selectableCell );
                let turnsNumber = Compass.getTurnsNumber( selectableCellSextant, targetSextant );
                if ( minDistance > distance || (minDistance === distance && minTurnsNumber > turnsNumber) ) {
                    minDistance = distance;
                    minTurnsNumber = turnsNumber;
                    closestSelectableCell = selectableCell;
                }
            }
        }
        return closestSelectableCell;
    }
    getFarthestSelectableCell( units ) { // Gets a selectable cell that is the farthest away from all the given units //
        console.assert( units && Array.isArray( units ), "Null argument found on method", this, units );
        let farthestSelectableCell = this.currentCell, selectableCellsMap = this.getSelectableCellsMap();
        let maxDistance = 0, maxCloseDistance = 0;
        for ( let selectableCellId in selectableCellsMap ) {
            let selectableCell = selectableCellsMap[ selectableCellId ];
            let distance = 0;
            let closeDistance = 0;
            units.forEach( function(unit, unitIndex) {
                distance += unit.currentCell.distanceFrom( selectableCell );
                if ( selectableCellsMap[unit.currentCell.id] ) {
                    ++closeDistance;
                }
            } );
            if ( maxDistance < distance || (maxDistance === distance && maxCloseDistance < closeDistance) ) {
                maxDistance = distance;
                maxCloseDistance = closeDistance;
                farthestSelectableCell = selectableCell;
            }
        }
        return farthestSelectableCell;
    }
    move() { // Moves this unit to the next cell //
        let nextCell = this.currentIntent.step.nextCell;
        console.assert( nextCell, "Null argument found on method", this );
        console.assert( nextCell && !nextCell.currentUnit, "The cell is already occupied", this );
        this.currentCell.removeCurrentUnit();
        this.previousCell = this.currentCell;
        this.currentCell = nextCell;
        this.currentCell.setCurrentUnit( this );
    }
    defend( unit ) { // Makes this unit defend the escorted unit //
        let nextCell = this.currentIntent.step.nextCell;
        console.assert( unit, "Null argument found on method", this );
        console.assert( nextCell, "Unable to find the cell with the friendly unit to defend", this, unit );
        console.assert( nextCell && nextCell.currentUnit, "The cell to defend is not occupied by any unit", this, unit );
        //console.assert( nextCell && nextCell.currentUnit && nextCell.currentUnit !== unit, "The unit that we need to defend is not present in the next cell", this );
        //console.assert( nextCell && nextCell.currentUnit && unit.player !== this.player, "The unit that we need to defend belongs to a different player", this );
        // DO NOTHING //
    }
    convertTo( player, oldIntent ) { // Converts this unit to the given player and assigns a given intent //
        console.assert( player && oldIntent, "Nulll argument found on method", this, player, oldIntent );
        //console.assert( player === this.player, "The unit to convert already belongs to the player", this, player );
        if ( !this.parentGame.cheats[Game.Cheat.Invulnerable] ) {
            if ( this.currentIntent && this.currentIntent.outcome === Intent.Outcome.Pending ) {
                this.currentIntent.deniedBy( Intent.DenyReason.UnitConversion, oldIntent );
            }

            // Set a new intent for the unit: such intent is inherited from the enemy unit that converted this unit //
            let newIntent = oldIntent.clone();
            newIntent.player = this.currentPlayer;
            newIntent.unit = this;
            newIntent.outcome = Intent.Outcome.Denied;
            this.previousIntent = newIntent;

            // Transfer ownership of this unit from a player to the other //
            this.currentPlayer.removeUnit( this );
            this.previousPlayer = this.currentPlayer;
            this.currentPlayer = player;
            this.currentPlayer.addUnit( this );
            this.convertedByIntent = oldIntent;
        }
    }
    hold() { // Makes this unit hold the current position //
        // DO NOTHING //
    }
}

class Instant { // An instant represents an elapsed unit of time, usually 1 second; a round is processed every instant //
    //TODO tick? beat?
}

class Intent { // An intent represents an objective that the player assigned to some unit
    // INSTANCE PROPERTIES //
    unit; // the unit this intent is for
    parentGame; // a reference to the parent game
    player; // player setting this intent
    currentCell; // the cell currently occupied by this unit
    targetCell; // the cell targeted by the player
    targetUnit; // the unit targeted by the player, if any
    step; // the step fulfilling this intent on the next round
    action; // action intended by this intent
    parentRound; // reference to the parent round of this intent
    id; // generated automatically when this intent is included in some round
    denyReason; // the reason why this intent was denied
    denier; // the intents that caused the denial of this intent
    outcome = Intent.Outcome.Pending; // final outcome of this intent
    hasMoved = false; // true if (and only if) this intent was granted and the unit has moved to a new cell

    // STATIC PROPERTIES //
    static Outcome = Object.freeze({
        "Granted": "Granted", /* this intent was granted */
        "Denied":  "Denied",  /* this intent was denied */
        "Pending": "Pending"  /* this intent is pending action */
    });
    static DenyReason = Object.freeze({
        "CircularLoop":           "CircularLoop",          /* this intent comes back in some loop of intents */
        "UnitConversion":         "UnitConversion",        /* this intent is denied due to its unit being converted */
        "MovementBlock":          "MovementBlock",         /* this intent of movement is blocked by some other unit */
        "MovementHole":           "MovementHole",          /* this intent of movement is blocked by a hole in the board */
        "ConversionBlock":        "ConversionBlock",       /* this intent of conversion is deflected by some other unit */
        "UnforeseenConsequences": "UnforeseenConsequences" /* this intent was denied due to unforeseen consequences */
    });
    static Action = Object.freeze({
        "Hold":    "Hold",    /* this intent is about holding position */
        "Move":    "Move",    /* this intent is about moving to another position */
        "Chase":   "Chase",   /* this intent is about chasing and capturing an enemy unit */
        "Escort":  "Escort",  /* this intent is about escorting and defending a friendly unit */
        "March":   "March"    /* this intent is about marching in a specified direction */
        /*"Harvest": "Harvest", /* this intent is about harvesting resources from the map */
        /*"Group":   "Group",   /* this intent is about regrouping in some position of the map */
        /*"Scout":   "Scout",   /* this intent is about scouting new regions of the map */
        /*"Align":   "Align",   /* this intent is about forming a trasversal line on the map */
        /*"Swarm":   "Swarm",   /* this intent is about forming a swarm circling around an area of the map */
        /*"Patrol":  "Patrol",  /* this intent is about patrolling an area of the map */
    });

    // CONSTRUCTOR //
    constructor( unit, targetCell, isMarching = false ) {
        console.assert( unit && targetCell, "Null argument found on constructor", unit, targetCell );
        this.unit = unit;
        this.parentGame = unit.parentGame;
        this.player = unit.currentPlayer;
        this.currentCell = unit.currentCell;
        this.targetCell = targetCell;
        this.targetUnit = ( this.player.getPlayerVisibleCellsMap()[targetCell.id] ) ? targetCell.currentUnit : null;
        this.step = new Step( unit, this.getNextCell() );
        this.action = !this.targetUnit ? Intent.Action.Move : ( this.targetUnit.currentPlayer.id !== unit.currentPlayer.id ) ? Intent.Action.Chase : ( unit.currentCell.id === this.targetCell.id ) ? Intent.Action.Hold : Intent.Action.Escort;
        if ( isMarching && this.action !== Intent.Action.Hold ) {
            this.targetCell = null;
            this.targetUnit = null;
            this.action = Intent.Action.March;
        }
    }

    // METHODS //
    getNextCell() { // Gets the most logical selectable cell for this intent //
        return this.unit.getClosestSelectableCell( this.targetCell );
    }
    deniedBy( denyReason, denier ) { // Denies the current intent and explains the reason why //
        console.assert( denyReason && denier, "Null argument found on method", this, denyReason, denier );
        if ( this.outcome === Intent.Outcome.Pending ) {
            this.outcome = Intent.Outcome.Denied;
            this.denyReason = denyReason;
            this.denier = denier;
            this.unit.intentHistory.push( this );
            this.unit.previousIntent = this;
            this.unit.currentIntent = null;
        }
    }
    granted() { // Grants the current intent //
        console.assert( this.outcome === Intent.Outcome.Pending, "This intent has already been processed", this );
        if ( this.step.nextCell.currentUnit ) {
            if ( this.step.nextCell.currentUnit.currentPlayer.id === this.unit.currentPlayer.id ) {
                if ( this.unit.currentCell.id !== this.step.nextCell.id ) {
                    this.unit.defend( this.step.nextCell.currentUnit );
                } else {
                    this.unit.hold();
                }
            } else {
                this.step.nextCell.currentUnit.convertTo( this.unit.currentPlayer, this );
            }
        } else {
            this.unit.move();
            this.hasMoved = true;
        }
        this.outcome = Intent.Outcome.Granted;
        this.unit.intentHistory.push( this );
        this.unit.previousIntent = this;
        this.unit.currentIntent = null;
    }
    clone() { // Clones the current intent //
        let clonedIntent;
        if ( this.targetUnit && this.targetUnit.id !== this.unit.id && this.unit.currentPlayer.getPlayerVisibleCellsMap()[ this.targetUnit.currentCell.id ] ) {
            clonedIntent = new Intent( this.unit, this.targetUnit.currentCell );
        } else if ( this.targetCell && !this.targetCell.isHole && this.targetCell.id !== this.unit.currentCell.id ) {
            clonedIntent = new Intent( this.unit, this.targetCell );
        } else {
            let newTargetX  = this.step.incrementCoordX + this.unit.currentCell.x;
            let newTargetY  = this.step.incrementCoordY + this.unit.currentCell.y;
            let newTargetId = this.parentGame.map.getCanonicalCoords( newTargetX, newTargetY ).toString();
            let targetCell = this.currentCell.parentMap.cells[ newTargetId ];
            console.assert( targetCell, "New target not found", this );
            clonedIntent = new Intent( this.unit, targetCell, true );
        }
        return clonedIntent;
    }
    rotateClockWise() { // Rotates the current intent in clockwise order //
        this.step.rotateClockWise();
        this.targetCell = null;
        this.targetUnit = null;
        this.action = Intent.Action.March;
    }
    rotateAnticlockWise() { // Rotates the current intent in anti-clockwise order //
        this.step.rotateAnticlockWise();
        this.targetCell = null;
        this.targetUnit = null;
        this.action = Intent.Action.March;
    }
}

class Player { // A player represents one of the gamers. Different types of players will behave differently //
    // INSTANCE PROPERTIES //
    id;   // ID of this player. Automatically assigned
    name; // name chosen by this player
    type; // type of this player
    startingCell; // cell in which this player starts the game
    startingRotation; // rotation in which this player starts the game
    units = {}; // map from unit ID to unit. It encloses all the units that belong to this player
    status = Player.Status.Playing; // current status of this player
    parentGame; // reference to the parent game
    //userId; // ID of the user that is currently interpreting this player

    // STATIC PROPERTIES //
    static counter = 0; // simple counter
    static Type = Object.freeze({
        "Passive":    "Passive",    /* computer player with no reaction, positioned at regular intervals */
        "Fugitive":   "Fugitive",   /* computer player that flees away as soon an enemy becomes visible, then keeps getting far */
        "Solitary":   "Solitary",   /* computer player that runs out-of-sight as soon as an enemy becomes visible, but stays still otherwise */
        "Retiring":   "Retiring",   /* computer player that steps back as soon as an enemy gets closeby, but stays still otherwise */
        "Defensive":  "Defensive",  /* computer player that attacks as soon as an enemy gets closeby, but stays still otherwise */
        "Aggressive": "Aggressive", /* computer player that attacks as soon as an enemy becomes visible, but stays still otherwise */
        "Hunter":     "Hunter",     /* computer player that attacks as soon as an enemy becomes visible, then walks randomly until a new prey is found */
        "Marching":   "Marching",   /* computer player that marches in a random direction */
        "Drunkard":   "Drunkard",   /* computer player that walks randomly */
        "Human":      "Human"       /* player controlled by a human */
    });
    static Status = Object.freeze({
        "Playing":    "Playing",   /* this player is still playing */
        "Defeated":   "Defeated",  /* this player has been defeated */
        "Victorious": "Victorious" /* this player is victorious */
    });

    // CONSTRUCTOR //
    constructor( name, type = Player.Type.Human ) {
        this.id = "p" + (++Player.counter);
        this.name = name ? name : "Player Number " + this.id;
        this.type = type;
    }

    // METHODS //
    setStartingCell( cell ) { // Sets the starting point of this player, corresponding to its center of the map //
        console.assert( cell, "Null argument found on method", this, cell );
        this.startingCell = cell;
    }
    getStartingRotation( sextant ) { // Sets the starting rotation of this player, corresponding to its North direction //
        console.assert( sextant, "Null argument found on method", this, sextant );
        this.startingRotation = sextant;
    }
    getTotalUnits() { // Gets the total number of units currently owned by this player //
        return Object.keys( this.units ).length;
    }
    addUnit( unit ) { // Adds a unit to the player //
        console.assert( unit, "Null argument found on method", this, unit );
        this.units[ unit.id ] = unit;
    }
    removeUnit( unit ) { // Removes a unit from the player //
        console.assert( unit, "Null argument found on method", this, unit );
        delete this.units[ unit.id ];
    }
    getPlayerVisibleCellsMap() { // Gets a map from the ID of a cell to the cell. It encloses all the cells that are currently visible by this player
        let playerVisibleCellsMap = {};
        for ( let unitId in this.units ) {
            let unit = this.units[ unitId ];
            let visibleCellsMap = unit.getVisibleCellsMap();
            for ( let unitVisibleCellId in visibleCellsMap ) {
                //let unitVisibleCell = visibleCellsMap[ unitVisibleCellId ];
                playerVisibleCellsMap[ unitVisibleCellId ] = true; //unitVisibleCell;
            }
        }
        return playerVisibleCellsMap;
    }
    chooseNewIntents() {
        switch( this.type ) {
            case Player.Type.Passive:
                // Loop over the units of the player //
                for ( let unitId in this.units ) {
                    let unit = this.units[ unitId ];
                    unit.setHoldIntent();
                }
                break;
            case Player.Type.Fugitive:
                // Loop over the units of the player //
                for ( let unitId in this.units ) {
                    let unit = this.units[ unitId ];
                    let visibleCellsMap = unit.getVisibleCellsMap();
                    let visibleEnemyUnits = [];
                    for ( let visibleCellId in visibleCellsMap ) {
                        let visibleCell = visibleCellsMap[ visibleCellId ];
                        if ( visibleCell.currentUnit && visibleCell.currentUnit.currentPlayer.id !== unit.currentPlayer.id ) {
                            // If there is any visible enemy, get away from it //
                            visibleEnemyUnits.push( visibleCell.currentUnit );
                        }
                    }
                    if ( visibleEnemyUnits.length === 0 ) {
                        // If a previous non-hold intent has been found, clone it; otherwise, assign a random intent //
                        let oldIntent = unit.previousIntent;
                        if ( oldIntent && oldIntent.action !== Intent.Action.Hold ) {
                            this.parentGame.addIntent( oldIntent.clone() );
                        } else {
                            unit.setRandomIntent();
                        }
                    } else {
                        unit.setTargetIntent( unit.getFarthestSelectableCell(visibleEnemyUnits) );
                    }
                }
                break;
            case Player.Type.Solitary:
                // Loop over the units of the player //
                for ( let unitId in this.units ) {
                    let unit = this.units[ unitId ];
                    let visibleCellsMap = unit.getVisibleCellsMap();
                    let visibleEnemyUnits = [];
                    for ( let visibleCellId in visibleCellsMap ) {
                        let visibleCell = visibleCellsMap[ visibleCellId ];
                        if ( visibleCell.currentUnit && visibleCell.currentUnit.currentPlayer.id !== unit.currentPlayer.id ) {
                            // If there is any visible enemy, get away from it //
                            visibleEnemyUnits.push( visibleCell.currentUnit );
                        }
                    }
                    if ( visibleEnemyUnits.length === 0 ) {
                        unit.setHoldIntent();
                    } else {
                        unit.setTargetIntent( unit.getFarthestSelectableCell(visibleEnemyUnits) );
                    }
                }
                break;
            case Player.Type.Retiring:
            // Loop over the units of the player //
            for ( let unitId in this.units ) {
                let unit = this.units[ unitId ];
                let selectableEnemyUnits = [];
                let selectableCellsMap = unit.getSelectableCellsMap();
                for ( let selectableCellId in selectableCellsMap ) {
                    let selectableCell = selectableCellsMap[ selectableCellId ];
                    if ( selectableCell.currentUnit && selectableCell.currentUnit.currentPlayer.id !== unit.currentPlayer.id ) {
                        // If there is any visible enemy, get away from it //
                        selectableEnemyUnits.push( selectableCell.currentUnit );
                    }
                }
                if ( selectableEnemyUnits.length === 0 ) {
                    unit.setHoldIntent();
                } else {
                    unit.setTargetIntent( unit.getFarthestSelectableCell(selectableEnemyUnits) );
                }
            }
            break;
            case Player.Type.Defensive:
                // Loop over the units of the player //
                for ( let unitId in this.units ) {
                    let unit = this.units[ unitId ];
                    let intent;
                    let selectableCellsMap = unit.getSelectableCellsMap();
                    for ( let selectableCellId in selectableCellsMap ) {
                        let selectableCell = selectableCellsMap[ selectableCellId ];
                        if ( selectableCell.currentUnit && selectableCell.currentUnit.currentPlayer.id !== unit.currentPlayer.id ) {
                            // If there is any selectable enemy, attack it //
                            intent = new Intent( unit, selectableCell );
                        }
                    }
                    if ( intent ) {
                        this.parentGame.addIntent( intent );
                    } else {
                        unit.setHoldIntent();
                    }
                }
                break;
            case Player.Type.Aggressive:
                // Loop over the units of the player //
                for ( let unitId in this.units ) {
                    let unit = this.units[ unitId ];
                    let selectableCellsMap = unit.getSelectableCellsMap();
                    let visibleCellsMap = unit.getVisibleCellsMap();
                    let intent;
                    for ( let selectableCellId in selectableCellsMap ) {
                        let selectableCell = selectableCellsMap[ selectableCellId ];
                        if ( selectableCell.currentUnit && selectableCell.currentUnit.currentPlayer.id !== unit.currentPlayer.id ) {
                            // If there is any selectable enemy, attack it //
                            intent = new Intent( unit, selectableCell );
                        }
                    }
                    if ( !intent ) {
                        for ( let visibleCellId in visibleCellsMap ) {
                            let visibleCell = visibleCellsMap[ visibleCellId ];
                            if ( visibleCell.currentUnit && visibleCell.currentUnit.currentPlayer.id !== unit.currentPlayer.id ) {
                                // If there is any visible enemy, attack it //
                                intent = new Intent( unit, visibleCell );
                            }
                        }
                    }
                    if ( intent ) {
                        this.parentGame.addIntent( intent );
                    } else {
                        unit.setHoldIntent();
                    }
                }
                break;
            case Player.Type.Hunter:
                // Loop over the units of the player //
                for ( let unitId in this.units ) {
                    let unit = this.units[ unitId ];
                    let selectableCellsMap = unit.getSelectableCellsMap();
                    let visibleCellsMap = unit.getVisibleCellsMap();
                    let intent;
                    for ( let selectableCellId in selectableCellsMap ) {
                        let selectableCell = selectableCellsMap[ selectableCellId ];
                        if ( selectableCell.currentUnit && selectableCell.currentUnit.currentPlayer.id !== unit.currentPlayer.id ) {
                            // If there is any selectable enemy, attack it //
                            intent = new Intent( unit, selectableCell );
                        }
                    }
                    if ( !intent ) {
                        for ( let visibleCellId in visibleCellsMap ) {
                            let visibleCell = visibleCellsMap[ visibleCellId ];
                            if ( visibleCell.currentUnit && visibleCell.currentUnit.currentPlayer.id !== unit.currentPlayer.id ) {
                                // If there is any visible enemy, attack it //
                                intent = new Intent( unit, visibleCell );
                            }
                        }
                    }
                    if ( intent ) {
                        this.parentGame.addIntent( intent );
                    } else {
                        unit.setRandomIntent();
                    }
                }
                break;
            case Player.Type.Marching:
                // Loop over the units of the player //
                for ( let unitId in this.units ) {
                    let unit = this.units[ unitId ];
                    let oldIntent = unit.previousIntent;
                    // If a previous non-hold intent has been found, clone it; otherwise, assign a random intent //
                    if ( oldIntent && oldIntent.action !== Intent.Action.Hold ) {
                        this.parentGame.addIntent( oldIntent.clone() );
                    } else {
                        unit.setRandomIntent();
                    }
                }
                break;
            case Player.Type.Drunkard:
                // Loop over the units of the player //
                for ( let unitId in this.units ) {
                    let unit = this.units[ unitId ];
                    // 40% of the times, assign a hold intent; otherwise, assign a random intent //
                    if ( Math.random() < 0.4 ) {
                        unit.setHoldIntent();
                    } else {
                        unit.setRandomIntent();
                    }
                }
                break;
            default: //Player.Type.Human
                // Loop over the units of the player //
                for ( let unitId in this.units ) {
                    let unit = this.units[ unitId ];
                    let oldIntent = unit.previousIntent;
                    if ( oldIntent ) {
                        this.parentGame.addIntent( oldIntent.clone() );
                    } else {
                        unit.setHoldIntent();
                    }
                }
                break;
        }
    }
}
