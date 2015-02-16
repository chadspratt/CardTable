/*global $ */
var mainApp,
    // used for a popup for adding/editing wiki data
    handWindow = null;

function Player(name) {
    'use strict';
    this.name = name;
    this.zones = {};
    this.counters = [];

    this.getZonesAsArray = function () {
        var zoneArray = [];
        for (var zone in this.zones) {
            if (this.zones.hasOwnProperty(zone) &&
                zone !== 'library') {
                zoneArray.push(this.zones[zone]);
            }
        }
        return zoneArray;
    };
}

function Zone(name) {
    'use strict';
    this.name = name;
    this.cards = [];
}

function TableData() {
    'use strict';
    var self = this;
    this.deckCSV = null;
    this.room = null;
    this.playerName = null;
    this.player = null;
    this.players = {};
    this.lastUpdateId = -1;

    this.setRoom = function (roomName) {
        this.room = roomName;
        this.lastUpdateId = -1;
        $.post('tableState.php',
                {
                    action: 'change_room',
                    room: this.room
                });
    };
    this.setPlayer = function (playerName) {
        this.playerName = playerName;
        if (!this.players.hasOwnProperty(playerName)) {
            this.players[playerName] = new Player(playerName);
            this.players[playerName].zones['library'] = new Zone('library');
        }
        this.player = this.players[playerName];
    };

    this._dbAddObjects = function (objectType, objects, zone) {
        if (this.room !== null && this.player !== null) {
            var objectIds = [],
                imageUrls = [],
                xPositions = [],
                yPositions = [];
            for (var i = 0; i < objects.length; i++) {
                objectIds.push(objects[i].id);
                imageUrls.push(objects[i].image_url);
                xPositions.push(objects[i].x);
                yPositions.push(objects[i].y);
            }
            $.post('tableState.php',
                    {
                        action: 'add',
                        room: this.room,
                        player: this.playerName,
                        zone: zone,
                        type: objectType,
                        'id[]': objectIds,
                        'image_url[]': imageUrls,
                        'x_pos[]': xPositions,
                        'y_pos[]': yPositions
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this.dbUpdateObject = function (object) {
        if (this.room !== null && this.player !== null) {
            $.post('tableState.php',
                    {
                        action: 'update',
                        room: this.room,
                        player: object.playerName,
                        zone: object.zone,
                        type: object.type,
                        id: object.id,
                        image_url: object.image_url,
                        x_pos: object.x,
                        y_pos: object.y,
                        rotation: object.rotation,
                        ordering: object.ordering
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this.dbUpdateLibraryOrdering = function () {
        if (this.room !== null && this.player !== null) {
            var library = this.player.zones['library'].cards,
                objectIds = [],
                orderings = [];
            for (var i = 0; i < library.length; i++) {
                objectIds.push(library[i].id);
                orderings.push(library[i].ordering);
            }
            $.post('tableState.php',
                    {
                        action: 'update_library_order',
                        room: this.room,
                        player: this.playerName,
                        'id[]': objectIds,
                        'ordering[]': orderings
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    };
    this._dbRemoveObject = function (object) {
        if (this.room !== null && this.player !== null) {
            $.post('tableState.php',
                    {
                        action: 'remove',
                        room: this.room,
                        player: object.playerName,
                        type: object.type,
                        id: object.id
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    }
    this._dbRemovePlayerObjects = function () {
        if (this.room !== null && this.player !== null) {
            $.post('tableState.php',
                    {
                        action: 'remove_all',
                        room: this.room,
                        player: this.playerName
                    },
                    function (data) {
                        self.lastUpdateId = data.last_update_id;
                    },
                    'json');
        }
    }

    this.processRoomState = function (newData) {
        // clear old data
        this.players = {};
        this.lastUpdateId = newData.change_id;
        for (var i = 0; i < newData.results.length; i++) {
            var object = newData.results[i];
            if (!this.players.hasOwnProperty(object.player)) {
                this.players[object.player] = new Player(object.player);
            }
            var player = this.players[object.player];
            if (!player.zones.hasOwnProperty(object.zone)) {
                player.zones[object.zone] = new Zone(object.zone);
            }
            var zone = player.zones[object.zone];

            if (object.type === 'card') {
                zone.cards.push({
                    type: object.type,
                    zone: object.zone,
                    id: object.id,
                    image_url: object.imageUrl,
                    x: object.xPos,
                    y: object.yPos,
                    playerName: object.player,
                    rotation: object.rotation,
                    ordering: object.ordering
                });
            } else if (object.type === 'counter') {
                player.counters.push({
                    type: object.type,
                    id: object.id,
                    image_url: object.imageUrl,
                    x: object.xPos,
                    y: object.yPos,
                    playerName: object.player
                });
            }
        }
        for (var playerName in this.players) {
            if (this.players.hasOwnProperty(playerName)) {
                for (var zoneName in this.players[playerName].zones) {
                    if (this.players[playerName].zones.hasOwnProperty(zoneName)) {
                        this.players[playerName].zones[zoneName].cards.sort(
                            function (a, b) {
                                return  a.ordering - b.ordering;
                            });
                    }
                }
            }
        }
        this.setPlayer(this.playerName);
    };

    this.loadDeckFromCSV = function (deckCSV) {
        this.deckCSV = deckCSV;
        this._dbRemovePlayerObjects();
        this.player.zones = {};
        this.player.zones['library'] = new Zone('library');
        this.player.zones['library'].cards = $.csv.toObjects(deckCSV);

        var duplicateCards = [],
            library = this.player.zones['library'].cards;
        for (var i = 0; i < library.length; i++) {
            var card = library[i];
            // assign an id to each card
            card.id = i;
            card.zone = 'library';
            card.type = 'card';
            card.rotation = 0;

            // create extra copies of duplicate cards
            for (var j = 1; j < card.count; j++) {
                duplicateCards.push({
                    // NAME: card.NAME,
                    image_url: card.image_url,
                    count: card.count,
                    id: library.length + duplicateCards.length,
                    zone: 'library',
                    type: 'card',
                    rotation: 0
                });
            }
        }
        library = library.concat(duplicateCards);
        this.player.zones['library'].cards = library;
        this._dbAddObjects('card', library, 'library');
        $('#libraryCount').text(library.length);
    };
    this.clearCounters = function () {
        this.player.counters = [];
    };
    this.resetDeck = function () {
        for (zone in this.player.zones) {
            if (this.player.zones.hasOwnProperty(zone) &&
                    zone !== 'library') {
                this.player.zones['library'].cards.concat(this.player.zones[zone].cards);
                this.player.zones[zone].cards = [];
            }
        }
        $('#libraryCount').text(this.player.zones['library'].length);
        this.shuffleLibrary();
    };

    this.shuffleLibrary = function () {
        var library = this.player.zones['library'].cards;
        for (var i = library.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = library[i];
            library[i] = library[j];
            library[j] = temp;
        }
        for (var i = library.length - 1; i > 0; i--) {
            library[i].ordering = i;
        }
        this.dbUpdateLibraryOrdering();
    };
    this.drawCard = function () {
        var library = this.player.zones['library'].cards;
        if (library.length > 0) {
            this.changeCardZone(library[library.length - 1],
                                'hand');
        }
    };
    this.changeCardZone = function (card, targetZone, end) {
        if (this.player.zones[card.zone].cards.length > 0) {
            // remove from old zone
            var sourceCards = this.player.zones[card.zone].cards;
            for (var i = 0; i < sourceCards.length; i++) {
                if (sourceCards[i].id == card.id) {
                    sourceCards.splice(i, 1);
                    break;
                }
            }

            // add to new zone
            if (!this.player.zones.hasOwnProperty(targetZone)) {
                this.player.zones[targetZone] = new Zone(targetZone);
            }
            var targetCards = this.player.zones[targetZone].cards,
                newOrdering = 0;
            if (targetZone === 'library' &&
                end === 'bottom') {
                for (i = 0; i < targetCards.length; i++) {
                    if (targetCards[i].ordering <= newOrdering) {
                        newOrdering = targetCards[i].ordering - 1;
                    }
                }
            } else {
                for (i = 0; i < targetCards.length; i++) {
                    if (targetCards[i].ordering >= newOrdering) {
                        newOrdering = targetCards[i].ordering + 1;
                    }
                }
            }

            targetCards.push(card);
            // update server
            card.zone = targetZone;
            card.ordering = newOrdering;
            this.dbUpdateObject(card);
        }
    };
    this.rotateLeft = function (card) {
        card.rotation = (card.rotation - 90) % 360;
        this.dbUpdateObject(card);
    };
    this.rotateRight = function (card) {
        card.rotation = (card.rotation + 90) % 360;
        this.dbUpdateObject(card);
    };
    this.getPlayerArray = function () {
        var playerArray = [],
            i = 0;
        for (var playerName in this.players) {
            if (this.players.hasOwnProperty(playerName)) {
                this.players[playerName].order = i;
                if (this.players[playerName] == this.player) {
                    var difference = i;
                }
                i += 1;
                playerArray.push(this.players[playerName]);
            }
        }
        for (i = 0; i < playerArray.length; i++) {
            playerArray[i].order = (playerArray[i].order - difference) % playerArray.length;
        };
        return playerArray;
    };
}

function PlayAreaSVG() {
    'use strict';
    var self = this;
    // set in init()
    this.svg = null;
    this.x = null;
    this.y = null;
    this.svgWidth = null;
    this.svgHeight = null;
    this.tableData = null;
    this.featureGroups = {};

    this.viewBox = {left: 0,
                    top: 0,
                    width: 0,
                    height: 0};

    this.scale = 1;
    this.boundary = null;
    this.featureIconSize = 15;
    this.needUpdate = false;
    this.featureClicked = false;

    this.init = function () {
        var canvasOffset;
        this.svg = d3.select('#playAreaSVG');
        this.resizeSVG();
        window.onresize = this.resizeSVG;
        canvasOffset = $('#playAreaSVG').offset();
        this.x = canvasOffset.left;
        this.y = canvasOffset.top;
        this.tableData = new TableData();
        this.tableData.setRoom($('#roomName').val());
        this.tableData.setPlayer($('#playerName').val());

        this.updateFromServer();
    };

    this.drag = d3.behavior.drag();
    this.drag.on('dragstart', function(d) {
        d3.event.sourceEvent.stopPropagation(); // silence other listeners
        // if it is an enlarged card, make it transparent so you can see where
        // you're dragging the actual-size card
        var img = d3.select(this),
            parent = d3.select($(this).parent()[0]);
        if (img.classed('enlarged')) {
            d.clicked = true;
            img = d.originCard;
            parent = d3.select($(d.originCard[0]).parent()[0]);
        }
        // put the card on top of other cards in its group
        var newOrdering = 0,
            siblings = parent.selectAll('image');
            siblings.each(function (d) {
            if (d.ordering >= newOrdering) {
                newOrdering = d.ordering + 1;
            }
        });

        d.ordering = newOrdering;
        // self.tableData.dbUpdateObject(d);

        siblings.sort(function(a, b) {
            return a.ordering - b.ordering;
        });
    });
    this.drag.on('drag', function (d) {
        var img = d3.select(this),
            parent = d3.select($(this).parent()[0]);
        // parent.append(img[0]);
        if (img.classed('enlarged')) {
            d.clicked = false;
            img.attr('opacity', '0.0');
            // move the enlarged card
            d.enlargedX += d3.event.dx;
            d.enlargedY += d3.event.dy;

            img.attr('x', d.enlargedX)
                .attr('y', d.enlargedY);

            // move source card beneath it too
            img = d.originCard;
        }

        // XXX this doesn't work correctly when dragging another player's cards
        // move the card
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        img.attr('x', d.x)
            .attr('y', d.y);
    });
    this.drag.on('dragend', function (d) {
        var img = d3.select(this);
        if (img.classed('enlarged')) {
            if (!d.clicked) {
                self.tableData.dbUpdateObject(d.originCard.data()[0]);
            } else {
                img.attr('opacity', '1.0');
            }
        } else {
            self.tableData.dbUpdateObject(d);
        }
    });

    this.updateFromServer = function () {
        if (this.tableData.room !== null) {
            $.post('tableState.php',
                    {
                        action: 'get_state',
                        room: this.tableData.room,
                        last_update_id: this.tableData.lastUpdateId
                    },
                    function (data) {
                        if (!data.hasOwnProperty('no_changes')) {
                            self.tableData.processRoomState(data);
                            self._drawCards();
                        }
                        self.updateFromServer();
                    },
                    'json')
            .fail(function () {
                // self.updateFromServer();
            });
        }
    };
    this.drawCard = function () {
        this.tableData.drawCard();
        this._drawCards();
    };
    this._drawCards = function () {
        d3.select('#cardButtons').selectAll("*").remove();

        var currentPlayer = this.tableData.player;
        $('#libraryCount').text(currentPlayer.zones['library'].cards.length);

        var playerArray = this.tableData.getPlayerArray();
        var players = d3.select('#players').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g');
        players
            .attr('transform', function (d) {
                d.rotation = 360 / playerArray.length * d.order;
                d.yOffset = -300 * (playerArray.length);

                return 'rotate(' + d.rotation + ' 100 ' + d.yOffset + ')';
            });
        players.exit().remove();

        var zones = players.selectAll('g')
            .data(function (d) { return d.getZonesAsArray(); },
                  function (d) { return d.name; });
        zones.enter().append('g');
        zones.exit().remove();

        var cards = zones.selectAll('image')
            .data(function (d) { return d.cards; },
                  function (d) { return d.id; });

        cards.enter().append('image')
            .attr('xlink:href', function (d) {
                if (d.zone !== 'hand' ||
                    d.playerName === self.tableData.playerName) {
                    return d.image_url;
                } else {
                    return 'cardback.png';
                }
            })
            .attr('x', function (d, i) {
                if (!d.hasOwnProperty('x')) {
                    d.x = 100;
                }
                return d.x;
            })
            .attr('y', function (d) {
                if (!d.hasOwnProperty('y')) {
                    d.y = 100;
                }
                return d.y;
            })
            .attr('width', function (d) {
                if (!d.hasOwnProperty('width')) {
                    d.width = 223;
                }
                return d.width;
            })
            .attr('height', function (d) {
                if (!d.hasOwnProperty('height')) {
                    d.height = 310;
                }
                return d.height;
            })
            .attr('transform', function (d) {
                var imgCenterX = d.x + d.width / 2,
                    imgCenterY = d.y + d.height / 2;
                return 'rotate(' + d.rotation + ' ' + imgCenterX + ' ' + imgCenterY + ')';
            })
            .call(this.drag);
        cards.exit().remove();
        cards.sort(function (a, b) {
            return a.ordering - b.ordering;
        });
        cards.on('mousemove', function showEnlargedCard(d) {
            var originCard = d3.select(this),
                scale = mainApp.playAreaSVG.scale;
            d.originCard = originCard;

            if (scale < 0.8 &&
                (d.zone !== 'hand' ||
                 d.playerName === self.tableData.playerName)) {
                var newCardData = d3.select('#enlargedCard').selectAll('image')
                        .data([d], function (d) {return d.image_url; }),
                    player = d3.select(d.originCard[0][0].parentNode.parentNode);
                mainApp.enlargedCard = newCardData.enter().append('image');
                mainApp.enlargedCard
                    .classed('enlarged', true)
                    .attr('transform', function (d) {
                        var imgCenterX = d.x + d.width / 2,
                            imgCenterY = d.y + d.height / 2,
                            playerData = player.datum(),
                            rotation = playerData.rotation * -1;
                            // var rotation = 360 / playerArray.length * d.order,
                        return player.attr('transform') + ' rotate(' + rotation +
                               ' ' + imgCenterX + ' ' + imgCenterY + ')';
                    })
                    .attr('xlink:href', function (d) {
                        return d.image_url;
                    })
                    .attr('x', function (d) {
                        d.enlargedX = d.x + (d.width * scale - d.width) / (2 * scale);
                        return d.enlargedX;
                    })
                    .attr('y', function (d) {
                        d.enlargedY = d.y + (d.height * scale - d.height) / (2 * scale);
                        return d.enlargedY;
                    })
                    .attr('width', function (d) {
                        d.enlargedWidth = d.width / scale;
                        return d.enlargedWidth;
                    })
                    .attr('height', function (d) {
                        d.enlargedHeight = d.height / scale;
                        return d.enlargedHeight;
                    })
                    .on('mousemove', function (d) {
                        var svgCoords = self.getSVGCoordinates(d3.event.x,
                                                               d3.event.y);
                        // XXX need to rotate d.x and y for this to work for
                        // other player's cards
                        if (self.tableData.playerName === d.playerName) {
                            if (svgCoords.x < d.x ||
                                svgCoords.x > d.x + d.width ||
                                svgCoords.y < d.y ||
                                svgCoords.y > d.y + d.height)
                            {
                                d3.select(this).remove();
                            }
                        }
                    })
                    // backup in case the mouse doesn't get caught in the
                    // mousemove removal zone
                    .on('mouseleave', function (d) {
                        d3.select(this).remove();
                    })
                mainApp.enlargedCard.call(self.drag);
                newCardData.exit().remove();

                mainApp.enlargedCard.on('click', function showCardButtons(d) {
                    if(!d.clicked ||
                       self.tableData.playerName !== d.playerName)
                    {
                        return;
                    }
                    // show buttons for own cards
                    var card = d;
                    // x/y/width/height are percentages of enlarged card width
                    var buttonData = {
                        rotateLeft: {
                            text: 'L',
                            x: 10,
                            y: 20,
                            width: 10,
                            height: 10
                        },
                        rotateRight: {
                            text: 'R',
                            x: 80,
                            y: 20,
                            width: 10,
                            height: 10
                        },
                        play: {
                            text: 'Play',
                            x: 30,
                            y: 20,
                            width: 40,
                            height: 10
                        },
                        hand: {
                            text: 'Hand',
                            x: 30,
                            y: 20,
                            width: 40,
                            height: 10
                        },
                        libraryBottom: {
                            text: 'B',
                            x: 10,
                            y: 35,
                            width: 10,
                            height: 10
                        },
                        library: {
                            text: 'Library',
                            x: 30,
                            y: 35,
                            width: 40,
                            height: 10
                        },
                        libraryTop: {
                            text: 'T',
                            x: 80,
                            y: 35,
                            width: 10,
                            height: 10
                        }
                    },
                        buttons = [];

                    if (d.zone === 'hand') {
                        buttons = [
                            buttonData.play,
                            buttonData.libraryTop,
                            buttonData.library,
                            buttonData.libraryBottom
                        ]
                    } else if (d.zone === 'inPlay') {
                        buttons = [
                            buttonData.rotateLeft,
                            buttonData.hand,
                            buttonData.rotateRight,
                            buttonData.libraryTop,
                            buttonData.library,
                            buttonData.libraryBottom
                        ]
                    }

                    d3.select('#cardButtons').selectAll("*").remove();

                    var cardButtons = d3.select('#cardButtons').selectAll('g')
                        .data(buttons, function (d) { return d.text });
                    cardButtons.enter().append('g')
                        .classed('button', true)
                        .on('click', function (d) {
                            if (d.text === 'L') {
                                self.tableData.rotateLeft(card);
                                self._drawCards();
                            } else if (d.text === 'R') {
                                self.tableData.rotateRight(card);
                                self._drawCards();
                            } else if (d.text === 'T') {
                                self.tableData.changeCardZone(card,
                                                              'library',
                                                              'top');
                                self._drawCards();
                            } else if (d.text === 'B') {
                                self.tableData.changeCardZone(card,
                                                              'library',
                                                              'bottom');
                                self._drawCards();
                            } else if (d.text === 'Play') {
                                self.tableData.changeCardZone(card,
                                                              'inPlay');
                                self._drawCards();
                            } else if (d.text === 'Hand') {
                                self.tableData.changeCardZone(card,
                                                              'hand');
                                self._drawCards();
                            }
                            d3.select('#cardButtons').selectAll("*").remove();
                        });
                    cardButtons.append('rect')
                        .attr('x', function (d) {
                            return card.enlargedX + card.enlargedWidth / 100 * d.x;
                        })
                        .attr('y', function (d) {
                            return card.enlargedY + card.enlargedWidth / 100 * d.y;
                        })
                        .attr('width', function (d) {
                            return card.enlargedWidth / 100 * d.width;
                        })
                        .attr('height', function (d) {
                            return card.enlargedWidth / 100 * d.height;
                        })
                        .attr('rx', 5)
                        .attr('ry', 5);
                    cardButtons.append('text')
                        .html(function (d) {
                            return d.text;
                        })
                        .style('font-size', function (d) {
                            var size = 1 / scale
                            return size + 'em';
                        })
                        .attr('x', function (d) {
                            return card.enlargedX + card.enlargedWidth / 100 * (d.x + 2);
                        })
                        .attr('y', function (d) {
                            return card.enlargedY + card.enlargedWidth / 100 * (d.y + 7);
                        });
                });
            }
        });
    };
    this.resizeSVG = function () {
        // http://stackoverflow.com/a/16265661/225730
        var w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0];

        self.svgWidth = (w.innerWidth || e.clientWidth || g.clientWidth) - 2;
        self.svgHeight = (w.innerHeight || e.clientHeight || g.clientHeight) - 2;

        self.svg.attr('width', self.svgWidth)
                   .attr('height', self.svgHeight);
        // check that map is initialized, which it should be
        if (self.scale !== 0) {
            self.viewBox.left -= (self.svgWidth / self.scale - self.viewBox.width) / 2;
            self.viewBox.top -= (self.svgHeight / self.scale - self.viewBox.height) / 2;
            self.viewBox.width = self.svgWidth / self.scale;
            self.viewBox.height = self.svgHeight / self.scale;
            self.svg.attr('viewBox', function() {
                return self.viewBox.left + ' ' +
                       self.viewBox.top + ' ' +
                       self.viewBox.width + ' ' +
                       self.viewBox.height;
            });
        }
    };
    this.applyViewBox = function () {
        self.svg.attr('viewBox', function() {
            return self.viewBox.left + ' ' +
                   self.viewBox.top + ' ' +
                   self.viewBox.width + ' ' +
                   self.viewBox.height;
        });
    };
    this.startPan = function (pageX, pageY) {
        this.startTranslation = {
            x: pageX,
            y: pageY
        };
        this.viewBoxStart = {
            left: this.viewBox.left,
            top: this.viewBox.top
        };
    };
    this.continuePan = function (pageX, pageY) {
        var mouseDelta = {
            x: pageX - this.startTranslation.x,
            y: pageY - this.startTranslation.y};
        this.viewBox.left = this.viewBoxStart.left - mouseDelta.x / this.scale;
        this.viewBox.top = this.viewBoxStart.top - mouseDelta.y / this.scale;
        self.applyViewBox();
        // distinguish pans from clicks
            self.featureClicked = false;
    };
    this.endPan = function (pageX, pageY) {
        this.lastTranslation = {
            x: pageX - this.x - this.startTranslation.x,
            y: pageY - this.y - this.startTranslation.y
        };
    };
    this.zoomIn = function (pageX, pageY) {
        var zoomFactor = 1.35;
        this.scale *= zoomFactor;
        this.viewBox.left += (pageX - this.x) / this.scale * (zoomFactor - 1);
        this.viewBox.top += (pageY - this.y) / this.scale * (zoomFactor - 1);
        this.viewBox.width = this.viewBox.width / zoomFactor;
        this.viewBox.height = this.viewBox.height / zoomFactor;
        this.applyViewBox();
        // self.scaleSelectedCard();
    };
    this.zoomOut = function (pageX, pageY) {
        var zoomFactor = 1 / 1.35;
        this.scale *= zoomFactor;
        this.viewBox.left = this.viewBox.left + (pageX - this.x) / this.scale * (zoomFactor - 1);
        this.viewBox.top = this.viewBox.top + (pageY - this.y) / this.scale * (zoomFactor - 1);
        this.viewBox.width = this.viewBox.width / zoomFactor;
        this.viewBox.height = this.viewBox.height / zoomFactor;
        this.applyViewBox();
        // self.scaleSelectedCard();
    };
    this.centerOn = function (x, y) {
        this.viewBox.left = x - self.viewBox.width / 2;
        this.viewBox.top = y - self.viewBox.height / 2;
        this.applyViewBox();
    };
    this.getSVGCoordinates = function (pageX, pageY) {
        return {
            x: Math.round(this.viewBox.left + pageX / this.scale),
            y: Math.round(this.viewBox.top + pageY / this.scale)
        };
    };
}

function MainApp() {
    'use strict';
    var self = this;
    this.playAreaSVG = null;
    this.coordDisplay = null;
    this.enlargedCard = null;
    this.mouseIsDown = false;

    // cache data when feature is clicked
    this.infoCache = {};

    this.init = function () {
        this.playAreaSVG = new PlayAreaSVG();
        this.playAreaSVG.init();
        this.coordDisplay = $('#coordDisplay');
        this.enlargedCard = $('#enlargedCard');
    };
    this.setCoordDisplay = function (x, y) {
        this.coordDisplay.html('x: ' + x + ' y: ' + y);
    };
    this.startMouse = function (pageX, pageY) {
        var mousePos;
        // check this in case the cursor was released outside the document
        // in which case the event would have been missed
        if (this.mouseIsDown) {
            this.playAreaSVG.endPan(pageX, pageY);
        }
        this.mouseIsDown = true;
        this.playAreaSVG.startPan(pageX, pageY);
    };
    this.moveMouse = function (pageX, pageY) {
        var mousePos = {x: 0, y: 0},
            nearbyFeature = null;
        // pan the map
        if (this.mouseIsDown) {
            this.playAreaSVG.continuePan(pageX, pageY);
        // update cursor coordinates
        } else {
            mousePos = this.playAreaSVG.getSVGCoordinates(pageX,
                                                          pageY);
            this.setCoordDisplay(mousePos.x, mousePos.y);
        }
    };
    this.endMouse = function (pageX, pageY) {
        // check that the click started on the canvas
        if (this.mouseIsDown) {
            this.mouseIsDown = false;
            this.playAreaSVG.endPan(pageX, pageY);
        }
    };
}


$(document).ready(function initialSetup() {
    'use strict';
    mainApp = new MainApp();
    mainApp.init();

    $('#playAreaSVG').on({
        'mousedown': function canvasMouseButtonPressed(event) {
            mainApp.startMouse(event.pageX, event.pageY);
        },
        // provided by jquery.mousewheel.js
        'mousewheel': function canvasMouseScrolled(event) {
            if (event.deltaY > 0) {
                mainApp.playAreaSVG.zoomIn(event.pageX,
                                         event.pageY);
            } else {
                mainApp.playAreaSVG.zoomOut(event.pageX,
                                          event.pageY);
            }
        }
    });
    $(document.body).on({
        'mousemove': function bodyMouseover(event) {
            mainApp.moveMouse(event.pageX, event.pageY);
        },
        'mouseup': function bodyMouseup(event) {
            mainApp.endMouse(event.pageX, event.pageY);
        },
        'mouseleave': function bodyMouseup(event) {
            mainApp.endMouse(event.pageX, event.pageY);
        }
    });

    $('#updateData').on('click', mainApp.playAreaSVG.tableData.update);
    $('#zoomOut').on('click', function zoomOut() {
        mainApp.playAreaSVG.zoomOut(mainApp.playAreaSVG.svgWidth / 2,
                                  mainApp.playAreaSVG.svgHeight / 2);
    });
    $('#zoomIn').on('click', function zoomIn() {
        mainApp.playAreaSVG.zoomIn(mainApp.playAreaSVG.svgWidth / 2,
                                  mainApp.playAreaSVG.svgHeight / 2);
    });

    $('#loadDeckForm').hide();
    $('#loadDeckHeader').on('click', function showLoadDeckForm() {
        $('#loadDeckForm').toggle();
    });
    $('#loadDeck').on('click', function passCSVToTableData() {
        var deckCSV = $('#deckCSV').val();
        mainApp.playAreaSVG.tableData.loadDeckFromCSV(deckCSV);
        $('#loadDeckForm').hide();
    });
    $('#shuffleLibrary').on('click', function shuffleLibrary() {
        mainApp.playAreaSVG.tableData.shuffleLibrary();
    });
    $('#drawCard').on('click', function drawCard() {
        mainApp.playAreaSVG.drawCard();
    });
    $('#setRoom').on('click', function setRoom() {
        mainApp.playAreaSVG.tableData.setRoom($('#roomName').val());
    });
    $('#setName').on('click', function setPlayer() {
        mainApp.playAreaSVG.tableData.setPlayer($('#playerName').val());
        mainApp.playAreaSVG._drawCards();
    });
});