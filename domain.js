"use strict";

// Model:          Gamer     Position    Map      Unit     Round      Command    Game
// Controllers:    Player    Cell        Board    Piece    Instant    Intent     Play

// The map must be isotropic ( = no special directions ) and homogeneous ( = no special places ) so to make the game as fair as possible

//TODO minimise state of all the classes; example: unit state = id (immutable), position id, player id, direction.
//TODO swap position with cell
//TODO include getSecondAdjacentCells() as singleton, then remove getVisibleCells
// CLASSES //

class Gamer { // A gamer represents one participant of the game. Different gamers may behave differently or have different roles in respect to the game
    //TODO
    //TODO add viewers
    //TODO show pieces on defeat
    //TODO add distance from center on Cell class
}

class Cell { // Represents an internal cell of some map. Only cells can be occupied or visited by units
    // INSTANCE PROPERTIES //
    parentMap; // reference to the parent map
    id;  // ID of this cell, depending on its coordinates
    x;   // absolute coordinate X of this cell in the parent map
    y;   // absolute coordinate Y of this cell in the parent map
    isHole; // true if (and only if) this cell is a hole in the map. Holes cannot be occupied by units
    sextant; // the sextant where this cell lies, based on the absolute coordinates of the map
    currentUnit; // a reference to some unit that is occupying this cell
    visitingPlayers = {}; // map from player ID to player; contains the players that had visibility over this cell in the past
    #adjacentCells; // list of all the adjacent cells, starting from the North direction in clockwise order

    // CONSTRUCTOR //
    constructor( map, id, x, y ) {
        console.assert( map && id && Number.isInteger(x) && Number.isInteger(y), "Null argument found on constructor", map, id, x, y );
        this.parentMap = map;
        this.id = id;
        this.x = x;
        this.y = y;
        this.isHole = Map.isHole( x, y, map.degreesOfFreedom );
        this.sextant = Compass.getSextant( x, y );
    }

    // FUNCTIONS //
    static getCartesianCoordinatesByHexagonalCoordinates( x, y ) { // Returns the cartesian coordinates of the given (hexagonal) absolute coordinates //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null arguments found on function", x, y );
        return [ x + y*0.5, y*0.8660 ]; /* 0.8660 = sqrt(3)/2 */
    }
    static getHexagonalCoordinatesByCartesianCoordinates( x, y ) { // Returns the absolute (hexagonal) coordinates of the given cartesian coordinates //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null arguments found on function", x, y );
        return [ x - y*0.5773, y*1.1547 ]; /* 0.5773 = sqrt(3)/3, 1.1547 = 2*sqrt(3)/3 */
    }

    // METHODS //
    distanceFrom( that ) { // Calculates the distance and the sextant between two cells //
        console.assert( that && Number.isInteger(that.x) && Number.isInteger(that.y), "Null argument found on method", this, that );
        let cellCoords = this.parentMap.getCanonicalCoords( that.x - this.x, that.y - this.y );
        let deltaX = cellCoords[ 0 ];
        let deltaY = cellCoords[ 1 ];
        switch( this.parentMap.shape ) {
            case Map.Shape.Hexagon:
                /*switch( Compass.getSextant(deltaX,deltaY) ) {
                    case Compass.Sextant.North:
                        return deltaY;
                    case Compass.Sextant.NorthEast:
                        return deltaX + deltaY;
                    case Compass.Sextant.SouthEast:
                        return deltaX;
                    case Compass.Sextant.South:
                        return -deltaY;
                    case Compass.Sextant.SouthWest:
                        return -(deltaX + deltaY);
                    case Compass.Sextant.NorthWest:
                        return -deltaX;
                    default:
                        return 0;
                }*/
                /* All the logic above can be comfortably written as below */
                return Math.max( Math.abs(deltaX), Math.abs(deltaY), Math.abs(deltaX+deltaY) );
            default: /*Map.Shape.Rhombus*/
                if ( Math.abs(deltaX+deltaY) >= this.parentMap.length ) {
                    /* In this case, that cell is in the North-East or in the South-West sextant; we need to apply a special logic by exploring the depth of the top-right triangle of cells */
                    return this.parentMap.length - 1 + Compass.exploreDepth( Math.abs(deltaX), Math.abs(deltaY), this.parentMap.length - 1, this.parentMap.length );
                } else {
                    /* In this case, just calculate the distance as if we were on an hexagon */
                    return Math.max( Math.abs(deltaX), Math.abs(deltaY), Math.abs(deltaX+deltaY) );
                }
        }
        /*return Math.ceil( Math.sqrt(deltaX*deltaX + deltaY*deltaY + deltaX*deltaY) );*/ // This number grows too quick for big deltas
    }
    getSextantOf( that ) { // Returns the sextant of the given cell in respect to this cell //
        console.assert( that && Number.isInteger(that.x) && Number.isInteger(that.y), "Null argument found on method", this, that );
        let cellCoords = this.parentMap.getCanonicalCoords( that.x - this.x, that.y - this.y );
        let deltaX = cellCoords[ 0 ];
        let deltaY = cellCoords[ 1 ];
        return Compass.getSextant( deltaX, deltaY );
    }
    setCurrentUnit( unit ) { // Sets a unit in this cell //
        console.assert( unit, "Null argument found on method", this, unit );
        console.assert( unit.currentCell === this, "The unit is not currently placed on this cell", this, unit );
        this.currentUnit = unit;
        this.visitingPlayers[ unit.currentPlayer.id ] = true;
    }
    removeCurrentUnit() { // Removes the unit from this cell //
        this.currentUnit = null;
    }
    getAdjacentCells() { // Gets an ordered array containing all the adjacent cells, excluding holes. The order is clockwise and is starting from the North sextant //
        if ( !this.#adjacentCells ) {
            this.#adjacentCells = this.getCellsWithDistance( 1 );
        }
        return this.#adjacentCells;
    }
    getCellsWithDistance( distance ) { // Gets an ordered array containing all the cells having a given distance from this cell. The order is clockwise, starting from the North sextant //
        console.assert( Number.isInteger(distance) && distance > 0, "Null argument found on method", this, distance );
        // Initialise some variables //
        let cells = [], cell;

        // North Sextant //
        for ( let x = -distance + 1; x <= 0; ++x ) {
            cell = this.parentMap.getCell( this.x + x, this.y + distance );
            cells.push( cell );
        }

        // North-East Sextant //
        for ( let x = 1; x <= distance; ++x ) {
            cell = this.parentMap.getCell( this.x + x, this.y + distance - x );
            cells.push( cell );
        }

        // South-East Sextant //
        for ( let y = -1; y >= -distance; --y ) {
            cell = this.parentMap.getCell( this.x + distance, this.y + y );
            cells.push( cell );
        }

        // South Sextant //
        for ( let x = distance - 1; x >= 0; --x ) {
            cell = this.parentMap.getCell( this.x + x, this.y - distance );
            cells.push( cell );
        }

        // South-West Sextant //
        for ( let x = -1; x >= -distance; --x ) {
            cell = this.parentMap.getCell( this.x + x, this.y - distance - x );
            cells.push( cell );
        }

        // North-West Sextant //
        for ( let y = 1; y <= distance; ++y ) {
            cell = this.parentMap.getCell( this.x - distance, this.y + y );
            cells.push( cell );
        }

        // Return the ordered cells //
        return cells;
    }
}

class Compass { // The direction from the center of the map to some given point //
    // STATIC PROPERTIES //
    static Sextant = Object.freeze({ // Represents a sixth of the map //
        "North":     "North",     /* northern sextant */
        "NorthEast": "NorthEast", /* north-eastern sextant */
        "SouthEast": "SouthEast", /* south-eastern sextant */
        "South":     "South",     /* southern sextant */
        "SouthWest": "SouthWest", /* south-western sextant */
        "NorthWest": "NorthWest"  /* north-western sextant */
    });
    static orderedSextants = [ /* The default order is clockwise, so to minimize the number of turns when selecting the minimal path to some target cell */
        Compass.Sextant.North,
        Compass.Sextant.NorthEast,
        Compass.Sextant.SouthEast,
        Compass.Sextant.South,
        Compass.Sextant.SouthWest,
        Compass.Sextant.NorthWest
    ];

    // FUNCTIONS //
    static getSextant( x, y ) { // Gets the sextant in which the given coordinates are resting, in respect to the center of the map //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null argument found on function", x, y );
        if ( x <= 0 && y > 0 && x+y > 0 ) { // NORTH SEXTANT
            return Compass.Sextant.North;
        } else if ( x > 0 && y >= 0 ) { // NORTH-EAST SEXTANT
            return Compass.Sextant.NorthEast;
        } else if ( x > 0 && y < 0 && x+y >= 0 ) { // SOUTH-EAST SEXTANT
            return Compass.Sextant.SouthEast;
        } else if ( x >= 0 && y < 0 && x+y < 0 ) { // SOUTH SEXTANT
            return Compass.Sextant.South;
        } else if ( x < 0 && y <= 0 ) { // SOUTH-WEST SEXTANT
            return Compass.Sextant.SouthWest;
        } else if ( x < 0 && y > 0 && x+y <= 0 ) { // NORTH-WEST SEXTANT
            return Compass.Sextant.NorthWest;
        } else {
            return null; /* This happens only at the center of the map */
        }
    }
    static getTurnsNumber( fromSextant, toSextant ) { // Gets the number of turns required to get from the first sextant to the second sextant, while following the default turn order //
        console.assert( fromSextant && toSextant, "Null arguments found on function", fromSextant, toSextant );
        let fromIndex = Compass.orderedSextants.indexOf( fromSextant );
        let   toIndex = Compass.orderedSextants.indexOf(   toSextant );
        let turnsNumber = toIndex - fromIndex;
        return turnsNumber >= 0 ? turnsNumber : turnsNumber + 6;
    } 
    static exploreDepth( x, y, max, maxSum ) { // This is used to explore the depth of a triangular disposition of cells; specifically, the triangular disposition of the top-right triangle on the North-East sextant //
        if ( x === max || y === max || x+y === maxSum ) {
            return 1;
        } else {
            return 1 + Cell.exploreDepth( x, y, max-1, maxSum+1 );
        }
    }
    static rotateByOneSextantAntiClockwise( x, y ) { // Rotates the coordinates by one sextant in anti-clockwise order //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null arguments found on function", x, y );
        return [ -y, x+y ];
    }
    static rotateByOneSextantClockwise( x, y ) { // Rotates the coordinates by one sextant in clockwise order //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null arguments found on function", x, y );
        return [ x+y, -x ];
    }
    static rotateByMultipleSextants( x, y, turnsNumber ) { // Rotates the coordinates by multiple sextants in clockwise order //
        console.assert( Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(turnsNumber), "Null arguments found on function", x, y );
        switch( turnsNumber % 6 ) {
            case  5:
            case -1:
                return [ -y, x+y ];
            case  4:
            case -2:
                return [ -x-y, x ];
            case  3:
            case -3:
                return [ -x, -y ];
            case  2:
            case -4:
                return [ y, -x-y ];
            case  1:
            case -5:
                return [ x+y, -x];
            default: /* case 0: */
                return [ x, y ];
        }
    }
}

class Map { // A map is composed by cells in a tabular grid, forming rows and columns. The cells are tiling the map. Some cells are "canonical", while the rest are repetitions of the cells
    // INSTANCE PROPERTIES //
    length; // length of this map
    shape;  // shape of this map
    degreesOfFreedom; // max degrees of freedom of the units on this map
    //hasOpenBorders = true; // true if (and only if) this map has "virtual" borders that teletransports the units on the opposite cell when passed
    diameter;   // diameter of the part of the map that contains the cells and their borders
    totalCells; // total cells present in this map
    defaultUnitCount; // default number of units that can be contained in this map
    cells = {}; // map from cell ID to cell; contains all the cells in the map

    // STATIC PROPERTIES //
    static Shape = Object.freeze({
        "Hexagon": "Hexagon", /* this map is shaped as an hexagon */
        "Rhombus": "Rhombus", /* this map is shaped as a rhombus */
        "Square":  "Square"   /* this map is shaped as a square */ //TODO remove this
    });
    static DegreesOfFreedom = Object.freeze({
        "Three": "triangular", /* this map can be tiled by regular triangles. Note that 6 regular triangles form an hexagon */
        "Four":  "tetragonal", /* this map can be tiled by rhombilles. Note that 3 rhombilles form an hexagon */
        "Five":  "pentagonal", /* this map can be tiled by pentagons. This is a tiling of type 5, group p6, orbifold signature 632, with a 6-tile primitive unit. Note that 6 pentagons form 7 regular hexagons in a "flower" shape */
        "Six":   "hexagonal"   /* this map can be tiled by regular hexagons */
    });

    // FUNCTIONS //
    static mathMod( x, y, z = 0 ) { // Calculates "result = x mod(y) + z" where z <= result < z+y //
        console.assert( Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z), "Null argument found on method", x, y, z );
        let remainder = (x-z) % y;
        let result = ( remainder < 0 ) ? remainder + y + z : remainder + z;
        return result;
    }
    static isHole( x, y, degreesOfFreedom ) { // Returns true if (and only if) the absolute coordinates lie on a hole //
        console.assert( Number.isInteger(x) && Number.isInteger(y) && degreesOfFreedom, "Null argument found on method", x, y, degreesOfFreedom );
        switch( degreesOfFreedom ) {
            case Map.DegreesOfFreedom.Three: // Acceptable length for rhombus: 2*length-1 mod(3)=0, aka length mod(3)=2; for hexagon: never
                return (Map.mathMod(x,3)===0 && Map.mathMod(y,3)===0) || (Map.mathMod(x,3)===1 && Map.mathMod(y,3)===1) || (Map.mathMod(x,3)===2 && Map.mathMod(y,3)===2);
            case Map.DegreesOfFreedom.Four: // Acceptable length for rhombus: 2*length-1 mod(2)=0, aka never; for hexagon: never
                return (Map.mathMod(x,2)===0 && Map.mathMod(y,2)===0);
            case Map.DegreesOfFreedom.Five: // Acceptable length for rhombus: 2*length-1 mod(7)=0, aka length mod(7)=4; for hexagon: length mod(7)=2
                return (Map.mathMod(x,7)===0 && Map.mathMod(y,7)===0) || (Map.mathMod(x,7)===1 && Map.mathMod(y,7)===4) || (Map.mathMod(x,7)===2 && Map.mathMod(y,7)===1) ||
                (Map.mathMod(x,7)===3 && Map.mathMod(y,7)===5) || (Map.mathMod(x,7)===4 && Map.mathMod(y,7)===2) || (Map.mathMod(x,7)===5 && Map.mathMod(y,7)===6) || (Map.mathMod(x,7)===6 && Map.mathMod(y,7)===3);
            default:
                return false;
        }
    }

    // CONSTRUCTOR //
    constructor( length = 9, shape = Map.Shape.Hexagon, degreesOfFreedom = Map.DegreesOfFreedom.Six ) {
        console.assert( Number.isInteger(length) && length > 1 && shape && degreesOfFreedom, "Null arguments on constructor", length, shape, degreesOfFreedom );
        // Instantiate some properties //
        this.length = length;
        this.shape = shape;
        this.degreesOfFreedom = degreesOfFreedom;

        // Apply different logic depending on the shape of this map //
        switch( this.shape ) {
            case Map.Shape.Hexagon:
                this.diameter = 2*this.length - 1;
                this.totalCells = 3*this.length*this.length - 3*this.length + 1;
                break;
            default: /*Map.Shape.Rhombus*/
                this.diameter = 2*this.length - 1;
                this.totalCells = this.diameter*this.diameter;
                break;
        }

        // Set the default number of units for this map //
        switch( degreesOfFreedom ) {
            case Map.DegreesOfFreedom.Three:
                this.defaultUnitCount = this.totalCells*2/3;
                break;
            case Map.DegreesOfFreedom.Four:
                this.defaultUnitCount = this.totalCells*3/4;
                break;
            case Map.DegreesOfFreedom.Five:
                this.defaultUnitCount = this.totalCells*6/7;
                break;
            default: // Map.DegreesOfFreedom.Six
                this.defaultUnitCount = this.totalCells;
                break;
        }
        this.defaultUnitCount = Math.floor( this.defaultUnitCount/14 )*2 + 1; // always an odd number

        // Instantiate all the cells //
        for ( let y = -this.length; y <= this.length; ++y ) {
            for ( let x = -this.length; x <= this.length; ++x ) {
                this.getCell( x, y );
            }
        }
    }

    // METHODS //
    getCanonicalCoords( x, y ) { // Gets the canonical coordinates of a cell given some absolute coordinates //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null argument found on method", this, x, y );
        // Apply different logic depending on the shape of this map //
        switch( this.shape ) {
            case Map.Shape.Hexagon:
                // If the cell is not canonically internal to the hexagon, we need to translate it on the other side of the hexagon //
                if ( !this.isValidCanonicalPosition(x,y) ) {
                    // Translate the coordinates based on the current sextant //
                    switch( Compass.getSextant(x,y) ) {
                        case Compass.Sextant.North:
                            x = x + this.length - 1;
                            y = y - this.diameter;
                            break;
                        case Compass.Sextant.NorthEast:
                            x = x - this.length;
                            y = y - this.length + 1;
                            break;
                        case Compass.Sextant.SouthEast:
                            x = x - this.diameter;
                            y = y + this.length;
                            break;
                        case Compass.Sextant.South:
                            x = x - this.length + 1;
                            y = y + this.diameter;
                            break;
                        case Compass.Sextant.SouthWest:
                            x = x + this.length;
                            y = y + this.length - 1;
                            break;
                        case Compass.Sextant.NorthWest:
                            x = x + this.diameter;
                            y = y - this.length;
                            break;
                        default:
                            // In this case, the coordinates must be the center of the map //
                            console.assert( x === 0 && y === 0, "Wrong coordinates", x, y );
                            break;
                    }
                    return this.getCanonicalCoords( x, y );
                }
                break;
            default: /*Map.Shape.Rhombus:*/
                // Calculate the MOD of the coordinates //
                x = Map.mathMod( x, this.diameter, -(this.length - 1) );
                y = Map.mathMod( y, this.diameter, -(this.length - 1) );
                break;
        }

        // Return the resulting coordinates //
        return [ x, y ];
    }
    getCell( x, y ) { // Gets the cell having the given absolute coordinates //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null argument found on method", this, x, y );
        // Retrieve the cell //
        let cellCoords = this.getCanonicalCoords( x, y );
        let cellId = cellCoords.toString();
        let cell = this.cells[ cellId ];

        // If not found, instantiate a new cell //
        if ( !cell ) {
            cell = new Cell(
                /*map*/ this,
                /*id*/  cellId,
                /*x*/   cellCoords[ 0 ],
                /*y*/   cellCoords[ 1 ]
            );
        }

        // Put the cell in the map of cells //
        this.cells[ cellId ] = cell;

        // Return the cell //
        return cell;
    }
    getRandomCell() { // Gets a random cell (holes excluded) in the map //
        let isSearching = true;
        let randomCell;
        while ( isSearching ) {
            let random_x = Math.floor( Math.random()*this.diameter );
            let random_y = Math.floor( Math.random()*this.diameter );
            randomCell = this.getCell( random_x, random_y );
            if ( randomCell && !randomCell.isHole ) isSearching = false;
        }
        return randomCell;
    }
    getRandomEmptyCell() { // Gets a random empty cell (holes excluded) in the map //
        let isSearching = true;
        let randomCell;
        while ( isSearching ) {
            randomCell = this.getRandomCell();
            if ( !randomCell.currentUnit ) isSearching = false;
        }
        return randomCell;
    }
    isValidCanonicalPosition( x, y ) { // Returns true if (and only if) the absolute coordinates are valid, according to the map shape //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null argument found on method", this, x, y );
        // Apply different logic depending on the shape of this map //
        switch( this.shape ) {
            case Map.Shape.Hexagon:
                return x > -this.length && x < this.length && y > -this.length && y < this.length && x + y > -this.length && x + y < this.length;
            default: /*Map.Shape.Rhombus:*/
                return x > -(this.length - 1) && x < this.length - 1 && y > -(this.length - 1) && y < this.length - 1;
        }
    }
    getStartingCells() { // Gets the absolute coordinates of the starting cell of each player
        /* To set the starting positions, we must first find what is the max possible distance of a cell from the center of the map */
        let max;
        let startX;
        let startY;
        switch( this.shape ) {
            case Map.Shape.Hexagon:
                /* The max distance of a cell from the center of the map is this.length - 1, along any direction */
                /* You can set max 3 players with max distance from each other; it is not possible to evenly position 6 players at each corner since some of them will be adjacent to some other */
                /* The starting position are such that they are compatible with holes */
                max = this.length - 1;
                startX = Math.ceil( max/2 );
                startY = 0;
                return [
                    this.getCell( startX, startY ), /* this is the max distance in the North-East sextant */
                    this.getCell( -(startX+startY), startX ), /* this is the previous position, rotated by 120 degrees */
                    this.getCell( startY, -(startX+startY) )  /* this is the previous position, rotated again by 120 degrees */
                ];
            default: /*Map.Shape.Rhombus*/
                /* The max distance of a cell from the center of the map is this.length - 1 + Math.floor( (this.length+1)/3 ), along the North-East/South-West direction */
                /* You can set max 2 players with max distance from each other */
                max = this.length - 1 + Math.floor( (this.length+1)/3 );
                startX = Math.ceil( max/4 );
                startY = Math.floor( max/4 );
                return [
                    this.getCell(  startX,  startY ),
                    this.getCell( -startX, -startY )
                ];
        }
    }
    getStartingRotations() { // Gets the rotation corresponding to the starting North direction of each player
        //TODO
    }
}

class Unit { // Represents a unit in the map. Units belong to players and can move around in the map
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
    #visibleCellsMap; // the temporary map from the ID of a cell to some cell. It encloses all the cells that are currently visible by this unit //TODO this is also a property of the position

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
    move( cell ) { // Moves this unit to some cell //
        let nextCell = cell ? cell : this.currentIntent.step.nextCell;
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

class Round {
    // INSTANCE PROPERTIES //
    roundNumber; // number of this round
    parentGame; // reference to the parent game
    intents = {}; // map from intent ID to intent. It encloses all the intents that belong to this round
    grantedIntents; // number of intents granted during this round
    totalIntents; // number of intents assigned during this round
    status = Round.Status.Running; // status of this round

    // STATIC PROPERTIES //
    static Status = Object.freeze({
        "Completed": "Completed", /* this round has been completed */
        "Running":   "Running"    /* this round is still running */
    });

    // CONSTRUCTOR //
    constructor( roundNumber, game ) {
        console.assert( Number.isInteger(roundNumber), "Null argument found on constructor", roundNumber );
        this.roundNumber = roundNumber;
        this.parentGame = game;
    }

    // METHODS //
    denyCircularIntents() { // Finds all the intents forming a loop, and then it denies them //
        // Create some maps from unit ID to intent, from unit ID to its chased/escorted unit ID, and from unit ID to the array of all the following unit IDs //
        let unitIdToIntent = {};
        let unitIdToNextUnitId = {};

        // Loop over each intent to populate the maps unitIdToIntent and unitIdToNextUnitId //
        for ( let intentId in this.intents ) {
            let intent = this.intents[ intentId ];
            if ( intent.step.nextCell.currentUnit && intent.step.nextCell.currentUnit !== intent.step.unit ) {
                unitIdToIntent[ intent.unit.id ] = intent;
                unitIdToNextUnitId[ intent.unit.id ] = intent.step.nextCell.currentUnit.id;
            }
        }

        // Populate the maps unitIdToAllNextUnitIDs //
        for ( let unitId in unitIdToNextUnitId ) {
            let allNextUnitIds = [];
            let allNextIntents = [];
            let nextUnitId = unitId;
            let nextIntent = unitIdToIntent[ nextUnitId ];
            let isLoop = false;
            while ( true ) {
                if ( allNextUnitIds.indexOf(nextUnitId) === -1 ) {
                    allNextUnitIds.push( nextUnitId );
                    allNextIntents.push( nextIntent );
                    nextUnitId = unitIdToNextUnitId[ nextUnitId ];
                    nextIntent = unitIdToIntent[ nextUnitId ];
                } else {
                    isLoop = ( nextUnitId === allNextUnitIds[0] );
                    break;
                }
            }

            // In case of a loop, deny the array of intents //
            if ( isLoop ) {
                allNextIntents.forEach( function(intent, intentIndex) {
                    intent.deniedBy( Intent.DenyReason.CircularLoop, allNextIntents );
                } );
            }
        }
    }
    satisfyMoveIntents() { // Finds all the valid intents about moving to an empty cell, and then it satisfies them //
        // Set a flag that is used in a while loop to decide if more unit movements are needed //
        let thereAreStillUnitsWithPendingIntent = true;
        while ( thereAreStillUnitsWithPendingIntent ) {
            // Create a map of all the contested cells and aggregate by their intents //
            let contestedCellIdToContestors = {};
            for ( let intentId in this.intents ) {
                let intent = this.intents[ intentId ];
                if ( intent.outcome === Intent.Outcome.Pending ) {
                    let contestedCell = intent.step.nextCell;
                    let contestors = contestedCellIdToContestors[ contestedCell.id ];
                    if ( contestors ) {
                        contestors.push( intent );
                    } else {
                        contestedCellIdToContestors[ contestedCell.id ] = [ intent ];
                    }
                }
            }

            // Temptatively set the flag to false //
            thereAreStillUnitsWithPendingIntent = false;

            // Loop over the contested cells //
            for ( let contestedCellId in contestedCellIdToContestors ) {
                let contestors = contestedCellIdToContestors[ contestedCellId ];
                let contestedCell = contestors[ 0 ].step.nextCell;

                // Check if the contested cell is empty //
                if ( !contestedCell.currentUnit ) {
                    // Check if there is only one contestor per cell or not //
                    if ( contestors.length === 1 ) {
                        // Check if the next cell is a hole or not //
                        if ( contestedCell.isHole /*|| !this.parentGame.map.isInternal(contestedCell.x, contestedCell.y)*/ ) {
                            // In such a case, deny the intent //
                            contestors[ 0 ].deniedBy( Intent.DenyReason.MovementHole, contestors );
                        } else {
                            // In such a case, satisfy the intent //
                            contestors[ 0 ].granted();
                        }

                        // Set the flag to true since we need to reapply the algorithm again for the rest of the intents //
                        thereAreStillUnitsWithPendingIntent = true;
                    } else {
                        // In such a case, deny the intents //
                        for ( let contestorIndex in contestors ) {
                            let contestor = contestors[ contestorIndex ];
                            contestor.deniedBy( Intent.DenyReason.MovementBlock, contestors );
                        }
                    }
                }
            }
        }
    }
    satisfyAttackIntents() { // Finds all the valid intents about capturing an enemy unit, and then it satisfies them //
        // Set a flag that is used in a while loop to decide if more unit conversions are needed //
        let thereAreStillUnitsWithPendingIntent = true;
        while ( thereAreStillUnitsWithPendingIntent ) {
            // Create a map of all the contested units and aggregate by their players and by their intents //
            let contestedUnitIdToContestingPlayers = {};
            for ( let intentId in this.intents ) {
                let intent = this.intents[ intentId ];
                let contestedUnit = intent.step.nextCell.currentUnit;
                if ( intent.outcome === Intent.Outcome.Pending && intent.step.nextCell.id !== intent.unit.currentCell.id && contestedUnit ) {
                    let contestingPlayers = contestedUnitIdToContestingPlayers[ contestedUnit.id ];
                    if ( contestingPlayers && contestingPlayers[intent.unit.currentPlayer.id] ) {
                        contestingPlayers[ intent.unit.currentPlayer.id ].push( intent );
                    } else if ( contestingPlayers ) {
                        contestingPlayers[ intent.unit.currentPlayer.id ] = [ intent ];
                    } else {
                        let contestingPlayers = {};
                        contestingPlayers[ intent.unit.currentPlayer.id ] = [ intent ];
                        contestedUnitIdToContestingPlayers[ contestedUnit.id ] = contestingPlayers;
                    }
                }
            }

            // Temptatively set the flag to false //
            thereAreStillUnitsWithPendingIntent = false;

            // Loop over the contested units //
            for ( let contestedUnitId in contestedUnitIdToContestingPlayers ) {
                let contestingPlayers = contestedUnitIdToContestingPlayers[ contestedUnitId ];
                let contestedUnit;
                for ( let contestingPlayerId in contestingPlayers ) {
                    let intentsOfContestingPlayer = contestingPlayers[ contestingPlayerId ];
                    contestedUnit = intentsOfContestingPlayer[ 0 ].step.nextCell.currentUnit;
                    break;
                }

                // Check if the contested unit is contested by only one player or more //
                let contestingPlayerIdsArray = Object.keys( contestingPlayers );
                if ( contestingPlayerIdsArray.length === 1 ) {
                    // Retrieve the ID of the contesting player and its list of intents //
                    let contestingPlayerId = contestingPlayerIdsArray[ 0 ];
                    let intents = contestingPlayers[ contestingPlayerId ];
                    // Check if there is at least one contesting unit that is not contested itself //
                    for ( let intentIndex in intents ) {
                        let intent = intents[ intentIndex ];
                        let contestingUnit = intent.unit;
                        if ( !contestedUnitIdToContestingPlayers[contestingUnit.id] ) {
                            // Check if the contesting player is friendly or enemy //
                            if ( contestingPlayerId !== contestedUnit.currentPlayer.id ) {
                                // In such a case, the attack was succeesful so satisfy the intent of the contestors but deny the intent of the contested unit //
                                //if ( contestedUnit.currentIntent && contestedUnit.currentIntent.outcome === Intent.Outcome.Pending ) contestedUnit.currentIntent.deniedBy( Intent.DenyReason.ConversionBlock, intents );
                                intent.granted();
                            } else {
                                // In such a case, the defense was useless and the friendly units blocked themselves so deny the intent //
                                intent.deniedBy( Intent.DenyReason.MovementBlock, intents );
                            }

                            // Set the flag to true since we need to reapply the algorithm again for the rest of the intents //
                            thereAreStillUnitsWithPendingIntent = true;
                        }
                    }
                } else {
                    // Loop over the players and check if there are at least two different players with unconfliced contestors //
                    // In order to do so, build a mapping from player ID to uncontested intents //
                    let playerIdToUncontestedIntents = {};
                    for ( let contestingPlayerId in contestingPlayers ) {
                        let intents = contestingPlayers[ contestingPlayerId ];
                        let unconflictedIntents = [];
                        for ( let intentIndex in intents ) {
                            let intent = intents[ intentIndex ];
                            let contestingUnit = intent.unit;
                            if ( !contestedUnitIdToContestingPlayers[contestingUnit.id] ) {
                                unconflictedIntents.push( intent );
                            }
                        }

                        // Include the array, but only if it has some elements //
                        if ( unconflictedIntents.length > 0 ) {
                            playerIdToUncontestedIntents[ contestingPlayerId ] = unconflictedIntents;
                        }
                    }

                    // Check if the mapping has at least two players //
                    let remainingPlayerIdsArray = Object.keys( playerIdToUncontestedIntents );
                    if ( remainingPlayerIdsArray.length > 1 ) {
                        // In such a case, the uncontested intents are not satisfiable since it is not clear to which player we can convert the contested unit to //
                        for ( let remainingPlayerId in playerIdToUncontestedIntents ) {
                            let uncontestedIntents = playerIdToUncontestedIntents[ remainingPlayerId ];
                            // Check if the contesting player is friendly or enemy //
                            if ( remainingPlayerId !== contestedUnit.currentPlayer.id ) {
                                // In such a case, the attack was unsuccessful so deny the intents //
                                for ( let intentIndex in uncontestedIntents ) {
                                    let intent = uncontestedIntents[ intentIndex ];
                                    intent.deniedBy( Intent.DenyReason.ConversionBlock, playerIdToUncontestedIntents );
                                }
                            } else {
                                // In such a case, the defense was successful so grant the intents //
                                for ( let intentIndex in uncontestedIntents ) {
                                    let intent = uncontestedIntents[ intentIndex ];
                                    intent.granted();
                                }
                            }
                        }

                        // Set the flag to true since we need to reapply the algorithm again for the rest of the intents //
                        thereAreStillUnitsWithPendingIntent = true;
                    }
                }
            }
        }
    }
    satisfyHoldIntents() { // Finds all the valid intents about holding its current cell, and then it satisfies them //
        // Loop over the remaining intents //
        for ( let intentId in this.intents ) {
            let intent = this.intents[ intentId ];
            // Check if the intent is still pending and it is about holding a position //
            if ( intent.outcome === Intent.Outcome.Pending && intent.step.nextCell.id === intent.unit.currentCell.id ) {
                // In such a case, satisfy the intent since this unit was not converted to any other player //
                intent.granted();
            }
        }
    }
    completeRound() { // Completes this round by handling all the intents within //
        /* REMARK: an intent is satisfied only when its outcome is deterministically non-ambiguous and non-conflicting with any other intent.
        In practice, that means that an intent is satisfied if (and only if) it will be granted in all the permutations of the order of execution of the intents.
        The algorithm repeats itself in loop until no intent can be satisfied anymore. The rest of the intents is denied */

        // Do not satisfy any circular loop of intents //
        this.denyCircularIntents();

        // Satisfy the intents of moving //
        this.satisfyMoveIntents();

        // Satisfy the intents of attacking or defending //
        this.satisfyAttackIntents();

        // Satisfy the intents of holding //
        this.satisfyHoldIntents();

        // Calculate all intent stats //
        this.totalIntents = 0;
        this.grantedIntents = 0;
        for ( let intentId in this.intents ) {
            let intent = this.intents[ intentId ];
            ++this.totalIntents;
            if ( intent.outcome === Intent.Outcome.Granted ) {
                ++this.grantedIntents;
            } else if ( intent.outcome === Intent.Outcome.Pending ) {
                console.assert( false, "Some intent was not satisfied during this round", intent);
                intent.deniedBy( Intent.DenyReason.UnforeseenConsequences, intent );
            }
        }

        // Finally, complete this round //
        this.status = Round.Status.Completed;
    }
}

class Rule { // A rule represents one criteria and one action on a given intent. If the criteria is met, its action is executed. If an action is executed, the state of the game is changed
    //  Each round must evaluate all the rules on all its intents, based on a strategy called "of minimal conflict" //
    //TODO evaulate rules on each round

    // STATIC PROPERTIES //
    static Evaluation = Object.freeze({
        "StepOnHole":  Rule.evaluateStepOnHole,  /* A unit is stepping into a hole */
        "StepOnEmpty": Rule.evaluateStepOnEmpty, /* A unit is stepping into an empty cell */
        "StepOnUnit":  Rule.evaluateStepOnUnit   /* A unit is stepping into another unit */
    });
    /* REMARK: the following order is so that: (1) units cannot move to holes; (2) units will be able to move around and flee from attacks; (3) units can attack other units */
    static EvaluationOrder = [
        Rule.Evaluation.StepOnHole,
        Rule.Evaluation.StepOnEmpty,
        Rule.Evaluation.StepOnUnit
    ];

    // FUNCTIONS //
    static evaluateStepOnHole( intent ) {
        // CRITERIA //
        if ( intent.step.nextCell.isHole ) {
            // ACTION //
            // DO NOTHING //
            return true;
        } else {
            return false;
        }
    }
    static evaluateStepOnEmpty( intent ) {
        // CRITERIA //
        if ( !intent.step.nextCell.currentUnit ) {
            // ACTION //
            // MOVE //
            intent.step.unit.move( intent.step.nextCell );
            return true;
        } else {
            return false;
        }
    }
    static evaluateStepOnUnit( intent ) {
        // CRITERIA //
        if ( intent.step.nextCell.currentUnit ) {
            // ACTION //
            // CONVERT //
            intent.step.nextCell.currentUnit.convertTo( intent.step.player, intent );
            return true;
        } else {
            return false;
        }
    }
}

class Command { // A step represents an action selected by a player on some unit
    //TODO
}

class Step { // A step represents a type of command that allows units to move around their current position
    // INSTANCE PROPERTIES //
    unit; // the unit attempting to execute this step
    player; // the player executing this step
    currentCell; // the cell this unit is currently occupying
    nextCell; // the cell this unit will attempt to step into at the next round
    direction = Step.Direction.North; // direction this step is pointing to
    incrementCoordX; // increment in the coordinate X so to move to the next cell
    incrementCoordY; // increment in the coordinate Y so to move to the next cell
    reaction; // the outcome of this step

    // STATIC PROPERTIES //
    static Direction = Object.freeze({
        "North":     "north",      /* north direction, the default one. Used for HOLD intents */
        "NorthEast": "north-east", /* north-east direction */
        "East":      "east",       /* east direction */
        "SouthEast": "south-east", /* south-east direction */
        "South":     "south",      /* south direction. Only used when there is an internal issue so the algorithm is not able to find an appropriate direction */
        "SouthWest": "south-west", /* south-west direction */
        "West":      "west",       /* west direction */
        "NorthWest": "north-west"  /* north-west direction */
    });
    static Reaction = Object.freeze({
        "CircularLoopDenied":  "CircularLoopDenied",
        "MovementHoleDenied":  "MovementHoleDenied",
        "MovementBlockDenied": "MovementBlockDenied",
        "MovementGranted":     "MovementGranted",
        "ConversionGranted":   "ConversionGranted",
        "ConversionDenied":    "ConversionDenied",
        "HoldGranted":         "HoldGranted"
    });

    // CONSTRUCTOR //
    constructor( unit, nextCell ) {
        this.unit = unit;
        this.player = unit.currentPlayer;
        this.currentCell = unit.currentCell;
        this.nextCell = nextCell;
        this.setDirection();
    }

    // METHODS //
    setDirection() {
        switch( this.currentCell.getSextantOf(this.nextCell) ) {
            case Compass.Sextant.North:
                this.incrementCoordX = 0;
                this.incrementCoordY = 1;
                this.direction = Step.Direction.NorthEast;
                break;
            case Compass.Sextant.NorthEast:
                this.incrementCoordX = 1;
                this.incrementCoordY = 0;
                this.direction = Step.Direction.East;
                break;
            case Compass.Sextant.SouthEast:
                this.incrementCoordX =  1;
                this.incrementCoordY = -1;
                this.direction = Step.Direction.SouthEast;
                break;
            case Compass.Sextant.South:
                this.incrementCoordX =  0;
                this.incrementCoordY = -1;
                this.direction = Step.Direction.SouthWest;
                break;
            case Compass.Sextant.SouthWest:
                this.incrementCoordX = -1;
                this.incrementCoordY =  0;
                this.direction = Step.Direction.West;
                break;
            case Compass.Sextant.NorthWest:
                this.incrementCoordX = -1;
                this.incrementCoordY =  1;
                this.direction = Step.Direction.NorthWest;
                break;
            default:
                this.incrementCoordX = 0;
                this.incrementCoordY = 0;
                this.direction = ( this.currentCell.id === this.nextCell.id ) ? Step.Direction.North : Step.Direction.South;
                break;
        }
    }
    rotateClockWise() { // Rotates this step in clockwise order //
        let nextCellIndex = -1;
        let that = this;
        this.currentCell.getAdjacentCells().forEach(
            function( adjacentCell, index ) {
                if ( adjacentCell === that.nextCell ) {
                    nextCellIndex = index;
                }
            }
        );
        ++nextCellIndex;
        if ( nextCellIndex === this.currentCell.getAdjacentCells().length ) nextCellIndex = 0;
        this.nextCell = this.currentCell.getAdjacentCells()[ nextCellIndex ];
        this.setDirection();
    }
    rotateAnticlockWise() { // Rotates this step in anti-clockwise order //
        let nextCellIndex = this.currentCell.getAdjacentCells().length;
        let that = this;
        this.currentCell.getAdjacentCells().forEach(
            function( adjacentCell, index ) {
                if ( adjacentCell === that.nextCell ) {
                    nextCellIndex = index;
                }
            }
        );
        --nextCellIndex;
        if ( nextCellIndex === -1 ) nextCellIndex = this.currentCell.getAdjacentCells().length - 1;
        this.nextCell = this.currentCell.getAdjacentCells()[ nextCellIndex ];
        this.setDirection();
    }
}

class Game {
    // INSTANCE PROPERTIES //
    id; // ID of this game. Automatically assigned
    players = {}; // map from player ID to player
    map; // the playable map of this game
    resourcePattern; // the pattern used to fill the main passive player - aka, the resource - on the map
    #currentRound; // current round of this game. Rounds are used as the unit of measure of time
    #previousRound; // the previous round of this game
    status = Game.Status.Active; // status of this game
    roundHistory = []; // history of all the rounds of this game, excluding the current one
    units = {}; // map from unit ID to unit, for all the units present in this game
    cheats = {}; // map from cheat code to boolean
    roundCounter = 0; // number of rounds elapsed
    names = [
        "Abe",
        "Ace",
        "Adi",
        "Ala",
        "Alf",
        "Anu",
        "Ari",
        "Ark",
        "Aro",
        "Art",
        "Asa",
        "Ash",
        "Ata",
        "Avi",
        "Axl",
        "Aya",
        "Bee",
        "Ben",
        "Bif",
        "Bil",
        "Bix",
        "Bob",
        "Bry",
        "Bud",
        "Buz",
        "Cam",
        "Chi",
        "Coy",
        "Dan",
        "Dax",
        "Del",
        "Des",
        "Dev",
        "Dom",
        "Don",
        "Dre",
        "Dru",
        "Dud",
        "Ean",
        "Ebb",
        "Efe",
        "Ege",
        "Eko",
        "Eli",
        "Eza",
        "Fil",
        "Fox",
        "Gar",
        "Geo",
        "Gig",
        "Gil",
        "Gin",
        "Gus",
        "Guy",
        "Han",
        "Huy",
        "Ian",
        "Idi",
        "Ido",
        "Ike",
        "Jai",
        "Jan",
        "Jax",
        "Jay",
        "Jeb",
        "Jed",
        "Jed",
        "Jem",
        "Joe",
        "Kai",
        "Ken",
        "Keo",
        "Kip",
        "Kit",
        "Koa",
        "Lad",
        "Lal",
        "Lee",
        "Len",
        "Leo",
        "Lex",
        "Lyn",
        "Max",
        "Neo",
        "Nic",
        "Nox",
        "Nye",
        "Oak",
        "Ode",
        "Oli",
        "Pat",
        "Pax",
        "Paz",
        "Pio",
        "Raj",
        "Ras",
        "Rex",
        "Rey",
        "Rob",
        "Roy",
        "Rue",
        "Rui",
        "Ryu",
        "Sam",
        "Sid",
        "Sky",
        "Stu",
        "Taj",
        "Tan",
        "Tim",
        "Tom",
        "Vic",
        "Wes",
        "Wil",
        "Wyn",
        "Yen",
        "Yug",
        "Zac",
        "Zai",
        "Zan",
        "Zay",
        "Zeb",
        "Zed",
        "Zef",
        "Zek",
        "Zel",
        "Zen",
        "Zev",
        "Zhi",
        "Ziv",
        "Zon"
    ]; // List of random names for the units

    // STATIC PROPERTIES //
    static #counter = 0; // simple counter
    static Status = Object.freeze({
        "Active": "Active", /* this game is still active */
        "Over":   "Over"    /* this game is over */
    });
    static Cheat = Object.freeze({
        "NoFogOfWar":   "NoFogOfWar",   /* removes the fog of war from the map */
        "Invulnerable": "Invulnerable", /* enemy units cannot convert your units anymore */
        "ShowIntents":  "ShowIntents",  /* shows the enemy's intents */
        "ShowColors":   "ShowColors"    /* shows the enemy players in different colors */
    });
    static Pattern = Object.freeze({
        "Casual":    "Casual",    /* Resources placed completely randomly */
        "Uniform":   "Uniform",   /* Resources placed at regular intervals, evenly equidistributed */
        "Snowflake": "Snowflake", /* Resources placed randmoly by using the symmetry of a snowflake */
        "Empty":     "Empty"      /* No resources */
    });

    // CONSTRUCTOR //
    constructor( playerArray = [], map = new Map(), resourcePattern = Game.Pattern.Snowflake ) {
        this.id = "g" + (++Game.#counter);
        this.map = map;
        this.resourcePattern = resourcePattern;
        this.#currentRound = new Round( this.roundCounter, this );

        // Add the players to the game //
        let thisGame = this;
        playerArray.forEach( function(player, playerIndex) {
            Game.addNewPlayer( thisGame, player, playerIndex );
        } );

        // Add a neutral player, to be used as a "resource" //
        let resource = new Player( "Resource", Player.Type.Passive );
        Game.addNewPlayer( thisGame, resource );

        // Add the resources by using some specified pattern //
        let unitCount = 0, unit, cell, cells;
        switch( this.resourcePattern ) {
            case Game.Pattern.Casual:
                // Resources positioned randomly //
                for ( let index = Object.keys(this.units).length; index < this.map.defaultUnitCount; ++index ) {
                    unit = new Unit( this, resource, this.map.getRandomEmptyCell() );
                    resource.addUnit( unit );
                    this.units[ unit.id ] = unit;
                }
                break;
            case Game.Pattern.Uniform:
                // Resources equidistributed evenly //
                for ( let cellId in this.map.cells ) {
                    cell = this.map.cells[ cellId ];
                    if ( !cell.currentUnit && !cell.isHole && Map.isHole(cell.x, cell.y, Map.DegreesOfFreedom.Five) ) {
                        unit = new Unit( this, resource, cell );
                        resource.addUnit( unit );
                        this.units[ unit.id ] = unit;
                    }
                }
                break;
            case Game.Pattern.Snowflake:
                // Resources positioned to form a snowflake
                cell = this.map.getCell( 0, 0 );
                if ( !cell.isHole ) {
                    unit = new Unit( this, resource, cell );
                    resource.addUnit( unit );
                    this.units[ unit.id ] = unit;
                    ++unitCount;
                }
                while ( unitCount < this.map.defaultUnitCount ) {
                    for ( let y = 0; y < this.map.length; ++y ) {
                        for ( let x = 0; x < this.map.length-y; ++x ) {
                            if ( unitCount < this.map.defaultUnitCount && Math.random()*this.map.totalCells < this.map.defaultUnitCount ) {
                                cells = [
                                    /*northEastCell    */this.map.getCell(    x,    y ),
                                    /*northCell        */this.map.getCell(   -y,  x+y ),
                                    /*northWestCell    */this.map.getCell( -x-y,    x ),
                                    /*southWestCell    */this.map.getCell(   -x,   -y ),
                                    /*southCell        */this.map.getCell(    y, -x-y ),
                                    /*southEastCell    */this.map.getCell(  x+y,   -x ),
                                    /*northEastCellTwin*/this.map.getCell(    y,    x ),
                                    /*northCellTwin    */this.map.getCell(   -x,  x+y ),
                                    /*northWestCellTwin*/this.map.getCell( -x-y,    y ),
                                    /*southWestCellTwin*/this.map.getCell(   -y,   -x ),
                                    /*southCellTwin    */this.map.getCell(    x, -x-y ),
                                    /*southEastCellTwin*/this.map.getCell(  x+y,   -y )
                                ];
                                cells.forEach(function( cell, index ) {
                                    if ( !cell.currentUnit && !cell.isHole ) {
                                        unit = new Unit( thisGame, resource, cell );
                                        resource.addUnit( unit );
                                        thisGame.units[ unit.id ] = unit;
                                        ++unitCount;
                                    }
                                });
                            }
                        }
                    }
                }
                break;
            default: /* Game.Pattern.Empty */
                // DO NOTHING //
                break;
        }
    }

    // FUNCTIONS //
    static addNewPlayer( game, player, playerIndex ) {
        player.parentGame = game;
        game.players[ player.id ] = player;
        if ( Number.isInteger(playerIndex) && playerIndex >= 0 && playerIndex < game.map.getStartingCells().length ) {
            let randomStartingCell = game.map.getStartingCells()[ playerIndex ];
            player.setStartingCell( randomStartingCell );
            let unit = new Unit( game, player, player.startingCell );
            player.addUnit( unit );
            game.units[ unit.id ] = unit;
        }
    }

    // METHODS //
    getTotalUnits() { // Gets the total number of units on this game //
        return Object.keys( this.units ).length;
    }
    getFreshRandomName() { // Gets a random unique name //
        let randomName, isNameNotFresh = true;
        while ( isNameNotFresh ) {
            randomName = this.names[ Math.floor(Math.random()*this.names.length) ]; //Math.random().toString( 36 ).replace( /[^a-z]+/g, "" ).substr( 0, 2 ).toUpperCase();
            if ( !this.units[randomName] ) {
                this.units[ randomName ] = true;
                isNameNotFresh = false;
            }
        }
        return randomName;
    }
    addIntent( intent ) { // Adds an intent on this game //
        console.assert( intent, "Null argument found on method", this, intent );
        intent.parentRound = this.#currentRound;
        intent.id = intent.unit.id;
        this.#currentRound.intents[ intent.id ] = intent;
        intent.unit.currentIntent = intent;
    }
    playNextRound() { // Moves time forward by playing the next round of the game //
        // Start the game, if needed //
        if ( this.#currentRound.roundNumber === 0 ) {
            console.log( "Game started" );
        } else {
            // Loop over all the units in the game //
            for ( let unitId in this.units ) {
                let unit = this.units[ unitId ];

                // Reset the selectable and the visible cells for this unit //
                unit.resetVisibility();

                // Include a HOLD intent to all the units without intent //
                if ( !unit.currentIntent ) {
                    unit.setHoldIntent();
                }
            }
        }

        // Complete the current round //
        this.#currentRound.completeRound();

        // Calculate the status of each player //
        for ( let playerId in this.players ) {
            let player = this.players[ playerId ];
            if ( player.getTotalUnits() === 0 ) {
                player.status = Player.Status.Defeated;
            } else {
                if ( player.getTotalUnits() === this.getTotalUnits() ) {
                    player.status = Player.Status.Victorious;
                    this.status = Game.Status.Over;
                }
            }
        }

        // Set the next round //
        ++this.roundCounter;
        this.#previousRound = this.#currentRound;
        this.#currentRound = new Round( this.roundCounter, this );
        this.roundHistory.push( this.#currentRound );

        // Set intents for the players //
        for ( let playerId in this.players ) {
            let player = this.players[ playerId ];
            player.chooseNewIntents();
        }

        // Assert clean state of the data //
        this.assertAllData(); //TODO comment this out at some point in the future
    }
    assertAllData() { // Asserts that all the data in the game makes logical sense //
        // Check the players //
        for ( let playerId in this.players ) {
            let player = this.players[ playerId ];
            console.assert( player.parentGame, "Null argument found on player", player );
        }

        // Check the cells //
        for ( let cellId in this.map.cells ) {
            let cell = this.map.cells[ cellId ];
            console.assert( cell.parentMap && Number.isInteger(cell.x) && Number.isInteger(cell.y), "Null argument found on cell", cell );
        }

        // Check the units //
        for ( let unitId in this.units ) {
            let unit = this.units[ unitId ];
            console.assert( unit.parentMap && unit.parentGame && unit.currentPlayer && unit.currentCell, "Null argument found on unit", unit );

            // Check that the current cell has a reference to the unit //
            console.assert( unit.currentCell.currentUnit && unit.currentCell.currentUnit === unit, "Cell does not have reference to its occupying unit", unit );
        }

        // Check the intents //
        let round = this.#previousRound;
        //console.assert( round.roundNumber === roundIndex, "This round does not have the correct round number " + roundIndex, round );
        for( let intentId in round.intents ) {
            let intent = round.intents[ intentId ];
            console.assert( intent.unit && intent.step.nextCell, "Null argument found on intent", intent );
            console.assert( intent.outcome !== Intent.Outcome.Pending, "This intent has not been processed", intent );
        }

        // Check that each unit has its own cell //
        let cellIdToUnit = {};
        for ( let unitId in this.units ) {
            let unit = this.units[ unitId ];
            let otherUnit = cellIdToUnit[ unit.currentCell.id ];
            if ( otherUnit ) {
                console.assert( false, "Found two units on the same cell", unit, otherUnit );
            } else {
                cellIdToUnit[ unit.currentCell.id ] = unit;
            }
        }

        // Check that each cell has its own unit //
        let unitIdToCell = {};
        for ( let cellId in this.map.cells ) {
            let cell = this.map.cells[ cellId ];
            if ( !cell.isHole && cell.currentUnit ) {
                let otherCell = unitIdToCell[ cell.currentUnit.id ];
                if ( otherCell ) {
                    console.assert( false, "Found two cells with the same unit", cell, otherCell );
                } else {
                    unitIdToCell[ cell.currentUnit.id ] = cell;
                }
            }
        }
    }
}
