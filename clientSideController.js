"use strict";

//TODO use second-click + drag
//TODO hover internal position when hovering on border
//TODO show pictures instead of names on the pieces

// CLASSES //

class Position { // Represents a position, internal or external, of some board
    // INSTANCE PROPERTIES //
    board; // reference to the parent board
    id;  // ID of this position, depending on its coordinates
    x;   // absolute coordinate X of this position in the board
    y;   // absolute coordinate Y of this position in the board
    cell; // the cell related to this position
    value; // label of this position to show to the player
    type;  // type of this position

    // STATIC PROPERTIES //
    static Type = Object.freeze({
        "Hole":     "is-hole",     /* this position is a hole in the board */
        "External": "is-external", /* this position is outside of the board */
        "Border":   "is-border",   /* this position is outside of the board but confining with it */
        "Internal": "is-internal", /* this position is inside the board */
        "Xen":      "is-xen"       /* this position has some unknown type */
    });

    // CONSTRUCTOR //
    constructor( board, id, x, y ) {
        console.assert( board && id && Number.isInteger(x) && Number.isInteger(y), "Null argument found on constructor", board, id, x, y );
        this.board = board;
        this.id = id;
        this.x = x;
        this.y = y;
        this.cell = board.map.getCell( x, y );
        this.value = [ this.cell.x + board.length - 1, this.cell.y + board.length - 1 ].toString();
        this.type = this.cell.isHole ? Position.Type.Hole : board.isBorder(x,y) ? Position.Type.Border : board.isExternal(x,y) ? Position.Type.External : board.isInternal(x,y) ? Position.Type.Internal : Position.Type.Xen;
    }
}

class Board { // Add square/rhombus visual options
    // INSTANCE PROPERTIES //
    map; // a reference to the parent map that must be represented as this board
    length; // length of the parent map
    shape; // the shape of this board
    diameter; // diameter of the part of the map that contains the internal positions and their borders
    outerSquareLength; // length of the outer square that contains all the cells
    outerSquareHeight; // height of the outer square that contains all the cells
    firstY; // the first coordinate Y (from the bottom) of the outer square
    centerCoordinates = [ 0, 0 ]; // the coordinates of the center
    isFlipped = false; // true if (and only if) the board has been flipped
    turnsNumber = 0; // the number of clockwise turns this board has been rotated

    // STATIC PROPERTIES //
    static Shape = Object.freeze({
        "Hexagon": "Hexagon", /* this board is shaped as an hexagon */
        "Rhombus": "Rhombus", /* this board is shaped as a rhombus */
        "Square":  "Square"   /* this board is shaped as a square */
    });

    // CONSTRUCTORS //
    constructor( map ) {
        this.map      = map;
        this.length   = map.length;
        this.shape    = map.shape;
        this.diameter = map.diameter;

        // Apply different logic depending on the shape of this map //
        switch( this.shape ) {
            case Board.Shape.Hexagon:
                this.outerSquareLength = 2*this.length + 1;
                this.outerSquareHeight = 2*this.length + 1;
                this.firstY = -this.length;
                break;
            case Board.Shape.Square:
                this.outerSquareLength = this.diameter + 2;
                this.outerSquareHeight = this.diameter + 2;
                this.firstY = -this.length;
                break;
            default: /*Board.Shape.Rhombus*/
                this.outerSquareLength = this.diameter + Math.floor(this.diameter/2) + 2;
                this.outerSquareHeight = this.diameter + 2;
                this.firstY = -this.length;
                break;
        }
    }

    // METHODS //
    isInternal( x, y ) {
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null argument found on method", this, x, y );
        let centerX = this.centerCoordinates[ 0 ];
        let centerY = this.centerCoordinates[ 1 ];
        let totCellsInRow = this.getTotalCellsPerRow( y );
        let firstX = this.getFirstXPerRow( y );
        return x >= firstX+centerX && x < firstX+totCellsInRow+centerX && y <= this.firstY+this.diameter+centerY && y > this.firstY+centerY;
    }
    isExternal( x, y ) { // Returns true if (and only if) the absolute coordinates lie externally of the board //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null argument found on method", this, x, y );
        return !this.isInternal(x,y);
    }
    isBorder( x, y ) { // Returns true if (and only if) the absolute coordinates lie externally of the board, but adjacent to internal positions //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null argument found on method", this, x, y );
        return this.isExternal(x,y) && (
            this.isInternal(x,y+1) || this.isInternal(x+1,y) || this.isInternal(x+1,y-1) || this.isInternal(x,y-1) || this.isInternal(x-1,y) || this.isInternal(x-1,y+1)
        )
    }
    getTotalCellsPerRow( y ) { // Gets the total number of internal positions to be found on a given row of the map
        // Apply different logic depending on the shape of this map //
        switch( this.shape ) {
            case Board.Shape.Hexagon:
                return ( y >= 0 ) ? this.diameter - y : this.diameter + y;
            default: /*Board.Shape.Square, Board.Shape.Rhombus*/
               return this.diameter;
        }
    }
    getFirstXPerRow( y ) { // Gets the coordinate X of the first internal position on a given row of the map
        // Apply different logic depending on the shape of this map //
        switch( this.shape ) {
            case Board.Shape.Hexagon:
                return ( y >= 0 ) ? -this.length + 1 : -this.length + 1 - y;
            case Board.Shape.Square:
                return ( this.diameter % 2 == 1 ) ? -Math.ceil((y-this.length)/2) + 1 : -Math.floor((y-this.length)/2) + 1;
            default: /*Board.Shape.Rhombus*/
                return -(this.length - 1);
        }
    }
    getOffsetPerRow( y ) { // Gets the offset in respect to the actual square grid. This is combined with firstX to obtain the coordinate X of the first external position on a given row of the map
        // Apply different logic depending on the shape of this map //
        switch( this.shape ) {
            case Board.Shape.Hexagon:
                return ( this.length % 2 == 0 ) ? Math.ceil( (this.outerSquareHeight - this.getTotalCellsPerRow(y))/2 ) : Math.floor( (this.outerSquareHeight - this.getTotalCellsPerRow(y))/2 );
            case Board.Shape.Square:
                return ( this.diameter % 2 == 0 ) ? Math.ceil( (this.outerSquareHeight - this.diameter)/2 ) : Math.floor( (this.outerSquareHeight - this.diameter)/2 );
            default: /*Board.Shape.Rhombus*/
                return ( this.diameter % 2 == 0 ) ? Math.ceil( (y+this.length-1)/2 ) + 1 : Math.floor( (y+this.length-1)/2 ) + 1;
        }
    }
    flip() { // Re-renders the board after flipping the x and the y coordinates //
        this.isFlipped = !this.isFlipped;
    }
    turnClockwise() { // Re-renders the board after rotating it by 60 degrees clockwise
        this.turnsNumber = this.turnsNumber + 1;
    }
    turnAntiClockwise() { // Re-renders the board after rotating it by 60 degrees anti-clockwise
        this.turnsNumber = this.turnsNumber - 1;
    }
    translateCenterTo( x, y ) {
        this.centerCoordinates = [ x, y ];
    }
}



/* RENDERERS */

class Play {
    // INSTANCE PROPERTIES //
    boardElement; // the HTML component that contains the board on the screen
    board; // the board to draw on the screen. It is a representation of the map of the game
    parentGame; // reference to the parent game
    rows; // all the rows shown on the scrren. Each row contains some positions
    positions; // map from position ID to position. This is a one-to-one relationship with the positions rendered in the HTML window for this player
    player; // the player to which the game is shown
    selectedUnits = {}; // a map of all the friendly units that are currently being selected by the player (this is used to assign intents in bulk)
    isGameOverForPlayer = false; // true if (and only if) this game is over or the player has been defeated
    automaticPlay; // if auto-play is on, this variable contains the javascript setInterval running automatically

    isRightClick = false;
    selectionBoxElement; // the selection box that is used to select multiple pieces with the mouse
    isSelectionBoxDragging = false;
    selectionBoxX = null;
    selectionBoxY = null;

    // CONSTRUCTOR //
    constructor( boardElement, game, player ) {
        console.assert( boardElement && game && player && game.players[player.id], "Null argument found on constructor", boardElement, game, player );
        this.boardElement = boardElement;
        this.board = new Board( game.map );
        this.parentGame = game;
        this.player = player;

        /* Render the board */
        this.firstRender();
    }

    /* FUNCTIONS */
    static onClickListener( event, play ) { // The listener for left-click events //
        //console.log( "onClickListener", event, play );
        if ( !play.isSelectionBoxDragging ) {
            let positionElement = event.target;
            if ( positionElement.tagName !== "LABEL" ) {
                positionElement = positionElement.parentElement;
            }
            if ( positionElement.children[2] && positionElement.children[2].id ) {
                let cellElement = positionElement.children[ 2 ];
                let position = play.positions[ cellElement.id ];
                //console.log( "position", position, position.id );

                // Check if the position is found and if it has some piece within //
                if ( position && position.cell && position.cell.currentUnit ) {
                    let clickedUnit = position.cell.currentUnit;
                    // Check if the click has a special modifier or not //
                    let isSpecialKey = event.ctrlKey || event.altKey || event.shiftKey;
                    if ( isSpecialKey ) {
                        // Retrieve the piece within the cell //
                        let selectedUnit = play.selectedUnits[ clickedUnit.id ];

                        // Check if the piece is currently selected or not //
                        if ( selectedUnit ) {
                            // If it is selected, remove it from the selection //
                            delete play.selectedUnits[ clickedUnit.id ];
                        } else if ( clickedUnit.currentPlayer.id === play.player.id ) {
                            // If it is not selected and it is friendly, include it in the selection //
                            play.selectedUnits[ clickedUnit.id ] = clickedUnit;
                        }
                    } else {
                        // Check if the clicked piece is friendly or not //
                        if ( clickedUnit.currentPlayer.id === play.player.id ) {
                            // In such a case, include it in the selection //
                            play.selectedUnits = {};
                            play.selectedUnits[ clickedUnit.id ] = clickedUnit;
                        } else {
                            // Otherwise, delete it from the selection // 
                            delete play.selectedUnits[ clickedUnit.id ];
                        }
                    }

                    // Rerender the screen //
                    play.rerender();
                }
            }
        } else {
            play.isSelectionBoxDragging = false;
        }
    }
    static onContextMenuListener( event, play ) { // The listener for right-click events //
        //console.log( "onContextMenuListener", event, play );
        let positionElement = event.target; //TODO use special-click to march on position
        if ( positionElement.tagName !== "LABEL" ) {
            positionElement = positionElement.parentElement;
        }
        if ( positionElement.children[2] && positionElement.children[2].id ) {
            let cellElement = positionElement.children[ 2 ];
            let position = play.positions[ cellElement.id ];

            // Check if the position is found //
            if ( position && position.cell && position.type !== Position.Type.External ) {
                // Create an intent for the selected pieces //
                for ( let selectedUnitId in play.selectedUnits ) {
                    let unit = play.selectedUnits[ selectedUnitId ];
                    if ( unit.currentPlayer.id === play.player.id ) {
                        unit.setTargetIntent( position.cell );
                    } else {
                        delete play.selectedUnits[ selectedUnitId ];
                    }
                }

                // Rerender the screen //
                play.rerender();
            }

            // Set the right-click flag //
            play.isRightClick = true;
        }
    }
    static onMouseDownListener( event, play ) { // The listener for mouse-down events //
        //console.log( "onMouseDownListener", event, play );
        play.selectionBoxX = event.pageX;
        play.selectionBoxY = event.pageY;
    }
    static onMouseMoveListener( event, play ) { // The listener for mouse-move events //
        //document.getElementById( "statsElement" ).textContent = "" + event.pageX + ", " + event.pageY;
        if ( !play.isRightClick && play.selectionBoxX !== null ) {
            //console.log( "onMouseMoveListener" );

            // Calculate some selection-box style properties //
            if ( play.selectionBoxX < event.pageX ) {
                play.selectionBoxElement.style.left = play.selectionBoxX + "px";
                play.selectionBoxElement.style.width = ( event.pageX - play.selectionBoxX ) + "px";
            } else {
                play.selectionBoxElement.style.left = event.pageX + "px";
                play.selectionBoxElement.style.width = ( play.selectionBoxX - event.pageX ) + "px";
            }
            if ( play.selectionBoxY < event.pageY ) {
                play.selectionBoxElement.style.top = play.selectionBoxY + "px";
                play.selectionBoxElement.style.height = ( event.pageY - play.selectionBoxY ) + "px";
            } else {
                play.selectionBoxElement.style.top = event.pageY + "px";
                play.selectionBoxElement.style.height = ( play.selectionBoxY - event.pageY ) + "px";
            }

            // Make the selection-box visible //
            play.selectionBoxElement.style.visibility = "visible";

            // Set the box-dragging flag //
            if ( !play.isSelectionBoxDragging ) play.isSelectionBoxDragging = true;
        }
    }
    static onMouseUpListener( event, play ) { // The listener for mouse-up events //
        //console.log( "onMouseUpListener", event, play );
        if ( !play.isRightClick && play.isSelectionBoxDragging ) {
            // Check if some friendly pieces have been selected or deselected //
            let isSpecialKey = event.ctrlKey || event.altKey || event.shiftKey;
            let toBeRerendered = false;
            let selectedUnits = {};
            let selectionRectangle = play.selectionBoxElement.getBoundingClientRect();
            let elements = document.getElementsByClassName( "is-piece is-friendly" );
            for ( let element of elements ) {
                let positionElement = element.parentElement;
                if ( positionElement.classList.contains( Position.Type.Internal) ) {
                    // Calculate the rectangle info for this element //
                    let elementRectangle = element.getBoundingClientRect();
                    if ( /* isOverlapping = isHorizontalOverlapping && isVerticalOverlapping */
                        /* isHorizontalOverlapping = */(selectionRectangle.left < elementRectangle.left + elementRectangle.width*0.77 && elementRectangle.left + elementRectangle.width*0.23 < selectionRectangle.right) && 
                        /* isVerticalOverlapping = */(selectionRectangle.top < elementRectangle.top + elementRectangle.height*0.77 && elementRectangle.top + elementRectangle.height*0.23 < selectionRectangle.bottom)
                    ) {
                        let selectedUnitId = element.dataset.unitId;
                        let selectedUnit = play.player.units[ selectedUnitId ];
                        if ( selectedUnit && selectedUnit.currentPlayer.id === play.player.id ) {
                            let isAlreadySelected = play.selectedUnits[ selectedUnitId ] != null;
                            if ( isSpecialKey && isAlreadySelected ) {
                                delete play.selectedUnits[ selectedUnitId ];
                            } else if ( isSpecialKey ) {
                                play.selectedUnits[ selectedUnitId ] = selectedUnit;
                            } else {
                                selectedUnits[ selectedUnitId ] = selectedUnit;
                            }
                            toBeRerendered = true;
                        }
                    }
                }
            }

            // Set the selection and rerender //
            if ( toBeRerendered ) {
                if ( Object.keys(selectedUnits).length > 0 ) {
                    play.selectedUnits = selectedUnits;
                }
                play.rerender();
            }
        }

        // Reset the selection info //
        play.selectionBoxElement.style.visibility = "hidden";
        play.isRightClick = false;
        play.selectionBoxX = null;
        play.selectionBoxY = null;
    }

    // METHODS //
    getPosition( x, y ) { // Gets the position having the given absolute coordinates //
        console.assert( Number.isInteger(x) && Number.isInteger(y), "Null argument found on method", this, x, y );
        // Retrieve the position //
        let positionId = [x,y].toString();
        let position = this.positions[ positionId ];

        // If not found, instantiate a new position //
        if ( !position ) {
            position = new Position(
                /*map*/ this.board,
                /*id*/  positionId,
                /*x*/   x,
                /*y*/   y
            );
        }

        // Put the position in the board of positions //
        this.positions[ positionId ] = position;

        // Return the position //
        return position;
    }
    firstRender() { // Renders the empty board on the screen. This only needs to run at the start of the game //
        // Clear the current board HTML element //
        this.boardElement.innerHTML = "";
        this.rows = [];
        this.positions = {};

        // Instantiate all the positions in the board //
        let centerX = this.board.centerCoordinates[ 0 ];
        let centerY = this.board.centerCoordinates[ 1 ];
        for ( let y = this.board.firstY+this.board.diameter+1; y >= this.board.firstY; --y ) {
            let row = [];
            this.rows.push( row );
            let firstX = this.board.getFirstXPerRow( y );
            let offset = this.board.getOffsetPerRow( y );
            let start = firstX - offset; // the start position of this row of cells
            for ( let x = start; x < start+this.board.outerSquareLength; ++x ) {
                // Flip //
                let reframedX = this.board.isFlipped ? y : x;
                let reframedY = this.board.isFlipped ? x : y;

                // Rotate //
                let rotatedFrame = Compass.rotateByMultipleSextants( reframedX, reframedY, this.board.turnsNumber );
                reframedX = rotatedFrame[ 0 ];
                reframedY = rotatedFrame[ 1 ];

                // Translate //
                reframedX = reframedX + centerX;
                reframedY = reframedY + centerY;

                // Push the reframed coordinates in the current row //
                row.push( this.getPosition(reframedX,reframedY) );
            }
        }
        // Get a reference to this class instance //
        let play = this;

        // Include some listeners related to the selection box //
        this.boardElement.addEventListener( "mousedown", function( event ) {
            Play.onMouseDownListener( event, play );
            event.preventDefault();
        }, false );
        this.boardElement.addEventListener( "mousemove", function( event ) {
            Play.onMouseMoveListener( event, play );
            event.preventDefault();
        }, false );
        window.addEventListener( "mouseup", function( event ) {
            Play.onMouseUpListener( event, play );
            event.preventDefault();
        }, false );

        // Include some listeners related to left-click and right-click events //
        this.boardElement.addEventListener( "click", function( event ) {
            Play.onClickListener( event, play );
            event.preventDefault();
        }, false );
        this.boardElement.addEventListener( "contextmenu", function( event ) {
            Play.onContextMenuListener( event, play );
            event.preventDefault();
        }, false );
        /*this.boardElement.addEventListener( "mouseover", function( event ) {
            // DO NOTHING //
        }, false );
        this.boardElement.addEventListener( "mouseout", function( event ) {
            // DO NOTHING //
        }, false );*/


        // Include an HTML board //
        let boardElement = document.createElement( "div" );
        boardElement.classList.add( "is-board" );

        // Loop over the rows //
        this.rows.forEach( function(row, rowNumber) {
            // Instantiate a span for the current row //
            let rowElement = document.createElement( "span" );
            rowElement.classList.add( "is-row" );
            row.forEach( function(position, indexNumber) {
                // Retrieve the related cell //
                let cell = position.cell;

                // Instantiate a label for the current position //
                let positionElement = document.createElement( "label" );
                positionElement.setAttribute( "for", position.id );
                positionElement.classList.add( position.type );

                // Instantiate a span for the related intent //
                let stepElement = document.createElement( "span" );

                // Instantiate a span for the related piece //
                let unitElement = document.createElement( "span" );

                // Include a few listeners //
                unitElement.addEventListener( "animationend", function( event ) {
                    if ( event.animationName !== "breath-animation" ) {
                        let className = event.animationName.replace( "-animation", "" );
                        unitElement.classList.remove( className );
                        event.preventDefault();
                    }
                }, false );
                stepElement.addEventListener( "animationend", function( event ) {
                    let className = event.animationName.replace( "-animation", "" );
                    stepElement.classList.remove( className );
                    event.preventDefault();
                }, false );

                // Instantiate a span for the related cell //
                let cellElement = document.createElement( "span" );
                cellElement.dataset.x = position.x;
                cellElement.dataset.y = position.y;
                cellElement.dataset.cellId = position.cell.id;
                cellElement.id = position.id;
                cellElement.classList.add( "is-cell" );

                cellElement.textContent = position.value;

                // Render the elements //
                positionElement.appendChild( stepElement );
                positionElement.appendChild( unitElement );
                positionElement.appendChild( cellElement );
                rowElement.appendChild( positionElement );
            } );

            // Render the current row //
            boardElement.appendChild( rowElement );
        } );

        // Create the selection box, that sits invisibly behind the board //
        play.selectionBoxElement = document.createElement( "div" );
        play.selectionBoxElement.classList.add( "is-selection-box" );

        // Append the new elements //
        play.boardElement.append( play.selectionBoxElement );
        play.boardElement.append( boardElement );

        // Rerender the screen to include piece colors and other info //
        this.rerender( true );
    }
    rerender( isNewRound ) { // Changes the relevant elements of the current screen //
        // REMARK: the isNewRound boolean will execute a full rerender of the entire board. You can freely invoke it multiple times even within a single round //
        // Retrieve some useful variables //
        let targetedUnits = this.getTargetedUnits();

        // Loop over the positions //
        for ( let positionId in this.positions ) {
            // Retrieve some useful variables //
            let position = this.positions[ positionId ];
            let cell = position.cell;
            let htmlPosition = document.getElementById( position.id );
            let positionElement = htmlPosition.parentElement;
            let stepElement = positionElement.children[ 0 ];
            let unitElement = positionElement.children[ 1 ];
            let cellElement = positionElement.children [ 2 ];

            // Find if the position is visible by the current player //
            let isVisible = this.player.getPlayerVisibleCellsMap()[ cell.id ] || this.parentGame.cheats[ Game.Cheat.NoFogOfWar ];

            // Check if this is a new round //
            if ( isNewRound ) {
                // If empty, reset any style related to pieces or intents //
                if ( !cell.currentUnit ) {
                    unitElement.textContent = "";
                    unitElement.removeAttribute( "data-unit-id" );
                    unitElement.className = "";
                    stepElement.classList = "";
                }
                cellElement.classList.remove( "was-contested" );

                // If the current player visited this position in the past, style the position accordingly //
                if ( cell.visitingPlayers[this.player.id] && !cellElement.classList.contains("was-visited") ) {
                    cellElement.classList.add( "was-visited" );
                }

                // If visible, apply the appropriate style; otherwise, remove it //
                if ( isVisible ) {
                    // Style the current position as visible //
                    if ( !cellElement.classList.contains("is-visible") ) cellElement.classList.add( "is-visible" );
                } else {
                    // Otherwise, style the current position as not visible //
                    if ( cellElement.classList.contains("is-visible") ) cellElement.classList.remove( "is-visible" );
                }
            }

            // Check if the position is visible by the current player //
            if ( isVisible && (position.type === Position.Type.Internal || position.type === Position.Type.Border) ) {
                // Check if the position has a piece within //
                if ( cell.currentUnit ) {
                    let unit = cell.currentUnit;

                    // Check if this is a new round //
                    if ( isNewRound ) {
                        // Include the unit ID in the position, to track the movement of the visible pieces //
                        unitElement.textContent = unit.id;
                        unitElement.dataset.unitId = unit.id;
                        unitElement.classList.add( "is-piece" );
                        unitElement.classList.remove( "was-denied" );

                        // Style the position to denote that there is a friendly or an enemy piece within //
                        if ( unit.currentPlayer.id === this.player.id ) {
                            if ( !unitElement.classList.contains("is-friendly") ) unitElement.classList.add( "is-friendly" );
                            if (  unitElement.classList.contains("is-hostile")  ) unitElement.classList.remove( "is-hostile" );
                        } else {
                            if ( !unitElement.classList.contains("is-hostile")  ) unitElement.classList.add( "is-hostile" );
                            if (  unitElement.classList.contains("is-friendly") ) unitElement.classList.remove( "is-friendly" );
                        }
                        if ( this.parentGame.cheats[Game.Cheat.ShowColors] ) {
                            unitElement.classList.remove( "is-blue" );
                            unitElement.classList.remove( "is-red" );
                            unitElement.classList.remove( "is-green" );
                            if ( unit.currentPlayer.id === "p1" ) unitElement.classList.add( "is-blue" );
                            if ( unit.currentPlayer.id === "p2" ) unitElement.classList.add( "is-red" );
                            if ( unit.currentPlayer.id === "p3" ) unitElement.classList.add( "is-green" );
                        }
                    }

                    // Check if the piece within this position is currently selected //
                    if ( this.selectedUnits[unit.id] && unit.currentPlayer.id === this.player.id ) {
                        // Style the position accordingly //
                        if ( !unitElement.classList.contains("is-selected") && !this.parentGame.cheats[Game.Cheat.ShowColors] ) unitElement.classList.add( "is-selected" );
                    } else {
                        if ( unitElement.classList.contains("is-selected") ) unitElement.classList.remove( "is-selected" );
                    }

                    // Check if the piece within this position is currently targeted //
                    if ( targetedUnits[unit.id] && unit.currentPlayer.id !== this.player.id ) {
                        // Style the position accordingly //
                        if ( !unitElement.classList.contains("is-targeted") && !this.parentGame.cheats[Game.Cheat.ShowColors] ) unitElement.classList.add( "is-targeted" );
                    } else {
                        if ( unitElement.classList.contains("is-targeted") ) unitElement.classList.remove( "is-targeted" );
                    }

                    // Check if this is a new round //
                    if ( isNewRound ) {
                        // Add a visual effect in case the previous intent was denied //
                        if ( unit.previousIntent && unit.previousIntent.outcome === Intent.Outcome.Denied ) {
                            if ( unit.previousIntent.player.id !== unit.currentPlayer.id ) {
                                if ( !unitElement.classList.contains("was-converted") ) unitElement.classList.add( "was-converted" );
                                if (  unitElement.classList.contains("was-denied")    ) unitElement.classList.remove( "was-denied" );
                            } else {
                                if ( !unitElement.classList.contains("was-denied")    ) unitElement.classList.add( "was-denied" );

                                // Show the contested position as contested //
                                let contestedCell = unit.previousIntent.step.nextCell;
                                if ( !contestedCell.currentUnit ) {
                                    let contestedPositionElements = document.querySelectorAll( "[data-cell-id='" + contestedCell.id + "']" );
                                    if ( contestedPositionElements.length > 0 ) contestedPositionElements[ 0 ].classList.add( "was-contested" );
                                }
                            }
                        } else if ( unit.previousIntent && unit.previousIntent.outcome === Intent.Outcome.Granted ) {
                            if ( unitElement.classList.contains("was-denied") ) unitElement.classList.remove( "was-denied" );
                            if ( unit.previousIntent.hasMoved ) {
                                unitElement.classList.add( "translate-" + unit.previousIntent.step.direction );
                            }
                        }
                    }

                    // If the cheat is on, show the current enemy intents to the current player //
                    if ( unit.currentIntent && (unit.currentPlayer.id === this.player.id || this.parentGame.cheats[Game.Cheat.ShowIntents]) ) {
                        if ( unit.currentIntent.step.direction !== Step.Direction.North ) {
                            stepElement.classList = "is-step-" + unit.currentIntent.step.direction;
                            if ( isNewRound && unit.previousIntent && unit.previousIntent.hasMoved ) {
                                stepElement.classList.add( "translate-" + unit.previousIntent.step.direction );
                            } else {
                                stepElement.classList.add( "is-step-rotating-animation" );
                            }
                        } else {
                            stepElement.classList = "";
                        }
                    } else if ( unit.previousIntent ) {
                        if ( unit.previousIntent.step.direction !== Step.Direction.North ) {
                            stepElement.classList = "is-step-" + unit.previousIntent.step.direction;
                            stepElement.classList.add( "is-step-rotating-animation" );
                        } else {
                            stepElement.classList = "";
                        }
                    } else {
                        stepElement.classList = "";
                    }
                }
            } else if ( !isVisible ) {
                unitElement.textContent = "";
                unitElement.removeAttribute( "data-unit-id" );
                unitElement.classList = "";
                stepElement.classList = "";
            }
        }
    }
    setAutomaticPlay( statsElement, timeElement, playToggleButtonElement ) {
        if ( !this.automaticPlay ) {
            let currentPlay = this;
            this.automaticPlay = setInterval( function() {
                currentPlay.renderNextRound();
                statsElement.innerText = currentPlay.getStatsLabel();
                timeElement.innerText = currentPlay.getTimeLabel();
            }, /*microseconds*/2000 );
            //playToggleButtonElement.value = "⏸";
        } else {
            clearInterval( this.automaticPlay );
            this.automaticPlay = null;
            //playToggleButtonElement.value = "▶️";
        }
    }
    renderNextRound() { // Plays the next round and rerenders the screen accordingly //
        // Play the next round //
        this.parentGame.playNextRound();

        // Remove any enemy pieces from the selection //
        let selectedEnemyUnitIds = [];
        for ( let selectedUnitId in this.selectedUnits ) {
            let selectedUnit = this.selectedUnits[ selectedUnitId ];
            if ( selectedUnit.currentPlayer.id !== this.player.id ) {
                selectedEnemyUnitIds.push( selectedUnitId );
            }
        }
        let play = this;
        selectedEnemyUnitIds.forEach( function( selectedEnemyUnitId, index ) {
            delete play.selectedUnits[ selectedEnemyUnitId ];
        } );

        // Include more pieces in the selection //
        for ( let unitId in this.player.units ) {
            let unit = this.player.units[ unitId ];
            if ( unit.convertedByIntent && unit.convertedByIntent.parentRound.roundNumber === this.parentGame.roundCounter - 1 && this.selectedUnits[unit.convertedByIntent.unit.id] ) {
                this.selectedUnits[ unitId ] = unit;
            }
        }

        // Rerender the screen //
        this.rerender( true );

        // Show a message to the player if the game is over or the player has been defeated //
        if ( !this.isGameOverForPlayer && (this.player.status !== Player.Status.Playing) ) {
            this.isGameOverForPlayer = true;
            let alertMessage = this.player.status === Player.Status.Defeated ? "You have been defeated" : "You are victorious! The game is over";
            window.alert( alertMessage );
        }
    }
    renderPreviousRound() { // Rollbacks the previous round and rerenders the screen accordingly //
        //TODO add logic to go back to the previous round
    }
    addCheat( cheat ) { // Adds a cheat on this game //
        console.assert( cheat, "Null argument on method", this, cheat );
        this.parentGame.cheats[ cheat ] = true; //TODO rework cheats
        this.rerender( true );
    }
    getStatsLabel() { // Gets the label with some player stats, to be shown on the screen //
        return "Stats: you own " + this.player.getTotalUnits() + " total piece(s) out of " + this.parentGame.getTotalUnits() + ((this.player.status === Player.Status.Defeated) ? ". You lost!" : (this.player.status === Player.Status.Victorious) ? ". YOU WON!" : "");
    }
    getTimeLabel() { // Gets the label with some time stats, to be shown on the screen //
        return "" + Math.max( 1, this.parentGame.roundCounter ) + " second(s) elapsed";
    }
    selectAllUnits() { // Selects all the friendly pieces of the player //
        this.selectedUnits = {};
        for ( let unitId in this.player.units ) {
            this.selectedUnits[ unitId ] = this.player.units[ unitId ];
        }
        this.rerender();
    }
    setHoldIntents() { // Sets a HOLD intent for all the selected pieces of the player //
        for ( let unitId in this.selectedUnits ) {
            let unit = this.selectedUnits[ unitId ];
            if ( unit.currentPlayer.id === this.player.id ) {
                unit.setHoldIntent();
            } else {
                delete this.selectedUnits[ unitId ];
            }
        }
        this.rerender();
    }
    rotateIntentsAnticlockWise() { // Rotates all the intents of player's selected pieces in anti-clockwise order //
        for ( let unitId in this.selectedUnits ) {
            let unit = this.selectedUnits[ unitId ];
            if ( unit.currentPlayer.id === this.player.id ) {
                if ( unit.currentIntent ) unit.currentIntent.rotateAnticlockWise();
            } else {
                delete this.selectedUnits[ unitId ];
            }
        }
        this.rerender();
    }
    rotateIntentsClockWise() { // Rotates all the intents of player's selected pieces in clockwise order //
        for ( let unitId in this.selectedUnits ) {
            let unit = this.selectedUnits[ unitId ];
            if ( unit.currentPlayer.id === this.player.id ) {
                if ( unit.currentIntent ) unit.currentIntent.rotateClockWise();
            } else {
                delete this.selectedUnits[ unitId ];
            }
        }
        this.rerender();
    }
    getTargetedUnits() {
        let targetedUnits = {};
        for ( let unitId in this.player.units ) {
            let unit = this.player.units[ unitId ];
            let intent = unit.currentIntent;
            if ( intent && intent.outcome === Intent.Outcome.Pending && intent.targetUnit ) {
                targetedUnits[ intent.targetUnit.id ] = intent.targetUnit;
            }
        }
        return targetedUnits;
    }
    flipBoard() { // Re-renders the board after flipping the x and the y coordinates //
        this.board.flip();
        this.firstRender(); //TODO the arrow of the intents is pointing in the wrong direction
    }
    turnBoardClockwise() { // Re-renders the board after rotating it by 60 degrees clockwise
        this.board.turnClockwise();
        this.firstRender(); //TODO the arrow of the intents is pointing in the wrong direction
    }
    turnBoardAntiClockwise() { // Re-renders the board after rotating it by 60 degrees anti-clockwise
        this.board.turnAntiClockwise();
        this.firstRender(); //TODO the arrow of the intents is pointing in the wrong direction
    }
    translateBoardCenterTo( x, y ) {
        this.board.translateCenterTo( x, y );
        this.firstRender();
    }
}



/* WINDOW */

let play;

window.onload = function() {
    // Retrieve the relevant HTML elements //
    const boardElement               = document.getElementById( "boardElement" );
    const playToggleButtonElement    = document.getElementById( "playToggleButtonElement" );
    const statsElement               = document.getElementById( "statsElement" );
    const timeElement                = document.getElementById( "timeElement" );
    const tipsButtonElement          = document.getElementById( "tipsButtonElement" );

    // Instantiate the play //
    const myself      = new Player( "Myself", Player.Type.Human );
    const enemy1      = new Player( "Enemy1", Player.Type.Aggressive );
    const enemy2      = new Player( "Enemy2", Player.Type.Fugitive );
    const currentPlay = new Play( boardElement, new Game([myself,enemy1,enemy2]), myself );
    statsElement.innerText = currentPlay.getStatsLabel();
    timeElement.innerText  = currentPlay.getTimeLabel();

    play = currentPlay;

    // Add some listeners //
    playToggleButtonElement.addEventListener( "click", function( event ) {
        currentPlay.setAutomaticPlay( statsElement, timeElement, playToggleButtonElement );
    }, false );
    tipsButtonElement.addEventListener( "click", function( event ) {
        let tips = "BASIC INSTRUCTIONS:";
        tips += "\r\n• To win the game, use your light-blue pieces to capture all the enemy orange pieces. Each piece has its own unique name and field-of-view.";
        tips += "\r\n• First step: select some pieces of yours by dragging a box on the map. The selected pieces will become blue.";
        tips += "\r\n• Second step: right-click anywhere on the map to set a direction. An arrow will appear above the selected pieces.";
        tips += "\r\n• By default, the game is on pause. Use the button ⏯ to start the game.";
        tips += "\r\n• Right-click on some enemy piece to chase it: the attacked enemy piece will become red. Beware: the enemy piece may decide to flee or to counter-attack!";
        tips += "\r\n";
        tips += "\r\nADVANCED INSTRUCTIONS:";
        tips += "\r\n• If you right-click a friendly or enemy piece on the map, your selected pieces will start following it.";
        tips += "\r\n• When an action is not realizable for some reason, the faulty pieces will get blocked and will flicker briefly.";
        tips += "\r\n• Use CTRL and your mouse to select/deselect multiple pieces. Use CTRL+A to select all your pieces at once.";
        tips += "\r\n• Use the arrow keys of your keyboard to rotate (clockwise / anti-clockwise) the direction of your selected pieces.";
        tips += "\r\n• The map does not have borders: when some piece reaches an end, it is immediately teleported to the opposite side.";
        tips += "\r\n• Press H to manully move the time forward by one second.";
        window.alert( tips );
    }, false );

    document.onkeydown = function(event) {
        let isSpecialKey = event.ctrlKey || event.altKey || event.shiftKey;
        switch( event.key ) {
            case "p":
            case "P":
                currentPlay.setAutomaticPlay( statsElement, timeElement, playToggleButtonElement );
                break;
            case "h":
            case "H":
                currentPlay.renderNextRound();
                statsElement.innerText = currentPlay.getStatsLabel();
                timeElement.innerText  = currentPlay.getTimeLabel();
                break;
            case "a":
            case "A":
                if ( isSpecialKey ) { // CTRL+A is used to select all the pieces
                    currentPlay.selectAllUnits();
                }
                break;
            case "z":
            case "Z":
                if ( isSpecialKey ) { // CTRL+Z is used to select all the pieces
                    currentPlay.renderPreviousRound();
                }
                break;
            case "ArrowUp": // Do the same as for ArrowDown //
            case "ArrowDown":
                currentPlay.setHoldIntents();
                break;
            case "ArrowLeft":
                currentPlay.rotateIntentsAnticlockWise();
                break;
            case "ArrowRight":
                currentPlay.rotateIntentsClockWise();
                break;
            default:
                // DO NOTHING //
                break;
        }
    }

    /* Start the game */
    currentPlay.renderNextRound();
}