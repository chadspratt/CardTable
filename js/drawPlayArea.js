/*global $ */
var mainApp;

function Player(name) {
    'use strict';
    this.name = name;
    this.zones = {};
    this.nextMarkerId = 0;
    this.markers = [];

    this.getZonesAsArray = function () {
        var zoneArray = [];
        for (var zone in this.zones) {
            if (this.zones.hasOwnProperty(zone) &&
                zone !== 'deck') {
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
            this.players[playerName].zones['deck'] = new Zone('deck');
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
    this.dbUpdateDeckOrdering = function () {
        if (this.room !== null && this.player !== null) {
            var deck = this.player.zones['deck'].cards,
                objectIds = [],
                orderings = [];
            for (var i = 0; i < deck.length; i++) {
                objectIds.push(deck[i].id);
                orderings.push(deck[i].ordering);
            }
            $.post('tableState.php',
                    {
                        action: 'update_deck_order',
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
            } else if (object.type === 'marker') {
                player.markers.push({
                    type: object.type,
                    id: object.id,
                    text: object.imageUrl,
                    x: object.xPos,
                    y: object.yPos,
                    playerName: object.player
                });
                if (object.id >= player.nextMarkerId) {
                    player.nextMarkerId = object.id + 1;
                }
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
        this.player.zones['deck'] = new Zone('deck');
        this.player.zones['deck'].cards = $.csv.toObjects(deckCSV);

        var duplicateCards = [],
            deck = this.player.zones['deck'].cards;
        for (var i = 0; i < deck.length; i++) {
            var card = deck[i];
            // assign an id to each card
            card.id = i;
            card.zone = 'deck';
            card.type = 'card';
            card.rotation = 0;

            // create extra copies of duplicate cards
            for (var j = 1; j < card.count; j++) {
                duplicateCards.push({
                    // NAME: card.NAME,
                    image_url: card.image_url,
                    count: card.count,
                    id: deck.length + duplicateCards.length,
                    zone: 'deck',
                    type: 'card',
                    rotation: 0
                });
            }
        }
        deck = deck.concat(duplicateCards);
        this.player.zones['deck'].cards = deck;
        this._dbAddObjects('card', deck, 'deck');
        $('#deckCount').text(deck.length);
    };
    this.createMarker = function (text) {
        var newMarker = {
            id: this.player.nextMarkerId,
            text: text,
            // to cram it in the same table as cards
            image_url: text,
            x: 0,
            y: 0,
            player: this.playerName,
            type: 'marker',
            ordering: 0
        };
        this.player.markers.push(newMarker);
        this.player.nextMarkerId += 1;
        this._dbAddObjects('marker',
                           [newMarker],
                           'ontop');
    };
    this.clearMarkers = function () {
        this.player.markers = [];
    };
    this.resetDeck = function () {
        for (zone in this.player.zones) {
            if (this.player.zones.hasOwnProperty(zone) &&
                    zone !== 'deck') {
                this.player.zones['deck'].cards.concat(this.player.zones[zone].cards);
                this.player.zones[zone].cards = [];
            }
        }
        $('#deckCount').text(this.player.zones['deck'].length);
        this.shuffleDeck();
    };

    this.shuffleDeck = function () {
        var deck = this.player.zones['deck'].cards;
        for (var i = deck.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = deck[i];
            deck[i] = deck[j];
            deck[j] = temp;
        }
        for (var i = deck.length - 1; i > 0; i--) {
            deck[i].ordering = i;
        }
        this.dbUpdateDeckOrdering();
    };
    this.drawCard = function () {
        var deck = this.player.zones['deck'].cards;
        if (deck.length > 0) {
            this.changeCardZone(deck[deck.length - 1],
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
            if (targetZone === 'deck' &&
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
    this.featureDragging = false;
    // point that all players are rotated around.
    // y varies based on number of players

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
        self.featureDragging = true;
        self.dragOffset = {x: null,
                           y: null};
        d3.event.sourceEvent.stopPropagation(); // silence other listeners
        var drugObject = d3.select(this),
            parent = d3.select($(this).parent()[0]);
        if (drugObject.classed('enlarged')) {
            d.clicked = true;
            drugObject.attr('x', d.x)
                .attr('y', d.y)
                .attr('height', d.height)
                .attr('width', d.width);
            drugObject = d.originCard;
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
        d.clicked = false;
        var drugObject = d3.select(this);
        if (self.dragOffset.x === null) {
            self.dragOffset = {
                x: d.x - d3.event.x,
                y: d.y - d3.event.y,
                enlargedX: d.enlargedX - d3.event.x,
                enlargedY: d.enlargedY - d3.event.y,
            };
        }

        d.x = d3.event.x + self.dragOffset.x;
        d.y = d3.event.y + self.dragOffset.y;

        $('#motionDisplay').html('dx: ' + d3.event.dx + ' dy: ' + d3.event.dy);
        mainApp.setCoordDisplay(d3.event.x, d3.event.y);
        if (drugObject.classed('enlarged')) {
            // drugObject.attr('opacity', '0.0');
            // d.originCard.attr('opacity', '0.0');

            d.enlargedX = d3.event.x + self.dragOffset.enlargedX;
            d.enlargedY = d3.event.y + self.dragOffset.enlargedY;

            drugObject
                .attr('x', d.x)
                .attr('y', d.y);

            // move source card beneath it too
            drugObject = d.originCard;
        }

        // move the card
        d.x = d3.event.x + self.dragOffset.x;
        d.y = d3.event.y + self.dragOffset.y;
        if (drugObject.classed('marker')) {
            var markerRect = drugObject.select('rect'),
                markerText = drugObject.select('text');
            markerRect.attr('x', d.x)
                .attr('y', d.y);
            markerText.attr('x', d.x + 2)
                .attr('y', d.y + 18);
        } else {
            drugObject.attr('x', d.x)
                .attr('y', d.y);
        }
    });
    this.drag.on('dragend', function (d) {
        self.featureDragging = false;
        var drugObject = d3.select(this);
        if (drugObject.classed('enlarged')) {
            d.originCard.attr('opacity', '1.0');
            if (!d.clicked) {
                self.tableData.dbUpdateObject(d.originCard.data()[0]);
            } else {
                drugObject.attr('x', d.enlargedX)
                    .attr('y', d.enlargedY)
                    .attr('height', d.enlargedHeight)
                    .attr('width', d.enlargedWidth);
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
                            self.drawMarkers();
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
        if (currentPlayer.zones.hasOwnProperty('deck')) {
            $('#deckCount').text(currentPlayer.zones['deck'].cards.length);
        }

        var playerArray = this.tableData.getPlayerArray();
        var players = d3.select('#players').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g');
        players
            .attr('transform', function (d) {
                var rotation = 360 / playerArray.length * d.order,
                    yOffset = -300 * (playerArray.length);

                return 'rotate(' + rotation + ' 100 ' + yOffset + ')';
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
            var originCard = d3.select(this);
            d.originCard = originCard;

            if (self.scale < 0.8 &&
                !self.featureDragging &&
                (d.playerName === self.tableData.playerName ||
                 d.zone !== 'hand')) {
                var player = d3.select(d.originCard[0][0].parentNode.parentNode),
                    enlargedCardZone = d3.select('#enlargedCard');
                enlargedCardZone
                    .attr('transform', function (d) {
                        return player.attr('transform');
                    });
                var newCardData = enlargedCardZone.selectAll('image')
                        .data([d], function (d) {return d.image_url; }),
                    player = d3.select(d.originCard[0][0].parentNode.parentNode);
                mainApp.enlargedCard = newCardData.enter().append('image');
                mainApp.enlargedCard
                    .classed('enlarged', true)
                    // .attr('transform', function (d) {
                    //     var imgCenterX = d.x + d.width / 2,
                    //         imgCenterY = d.y + d.height / 2,
                    //         playerData = player.datum(),
                    //         rotation = playerData.rotation * -1;
                    //         // var rotation = 360 / playerArray.length * d.order,
                    //     // return player.attr('transform') + ' rotate(' + rotation +
                    //     //        ' ' + imgCenterX + ' ' + imgCenterY + ')';
                    //     return player.attr('transform');
                    // })
                    .attr('xlink:href', function (d) {
                        return d.image_url;
                    })
                    .attr('x', function (d) {
                        d.enlargedX = d.x + (d.width * self.scale - d.width) / (2 * self.scale);
                        return d.enlargedX;
                    })
                    .attr('y', function (d) {
                        d.enlargedY = d.y + (d.height * self.scale - d.height) / (2 * self.scale);
                        return d.enlargedY;
                    })
                    .attr('width', function (d) {
                        d.enlargedWidth = d.width / self.scale;
                        return d.enlargedWidth;
                    })
                    .attr('height', function (d) {
                        d.enlargedHeight = d.height / self.scale;
                        return d.enlargedHeight;
                    })
                    .on('mousemove', function (d) {
                        var svgCoords = self.getSVGCoordinates(d3.event.x,
                                                               d3.event.y);
                        // XXX need to rotate d.x and y for this to work for
                        // rotated cards
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
                        if (!self.featureDragging) {
                            d3.select(this).remove();
                        }
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
                        deckBottom: {
                            text: 'B',
                            x: 10,
                            y: 35,
                            width: 10,
                            height: 10
                        },
                        deck: {
                            text: 'Deck',
                            x: 30,
                            y: 35,
                            width: 40,
                            height: 10
                        },
                        deckTop: {
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
                            buttonData.deckTop,
                            buttonData.deck,
                            buttonData.deckBottom
                        ];
                    } else if (d.zone === 'inPlay') {
                        buttons = [
                            buttonData.rotateLeft,
                            buttonData.hand,
                            buttonData.rotateRight,
                            buttonData.deckTop,
                            buttonData.deck,
                            buttonData.deckBottom
                        ];
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
                                                              'deck',
                                                              'top');
                                self._drawCards();
                            } else if (d.text === 'B') {
                                self.tableData.changeCardZone(card,
                                                              'deck',
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
                            var size = 1 / self.scale
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
    this.drawMarkers = function () {
        var playerArray = this.tableData.getPlayerArray();
        var players = d3.select('#markers').selectAll('g')
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

        var markers = players.selectAll('g')
            .data(function (d) { return d.markers; },
                  function (d) { return d.id; });
        markers.enter().append('g')
            .classed('marker', true);
        markers.exit().remove();

        markers.append('rect')
            .attr('x', function (d) {
                return d.x;
            })
            .attr('y', function (d) {
                return d.y;
            })
            .attr('rx', 5)
            .attr('ry', 5);
        markers.append('text')
            .html(function (d) {
                return d.text;
            })
            .style('font-size', function (d) {
                var size = 1 / self.scale;
                return size + 'em';
            })
            .attr('x', function (d) {
                return d.x + 2;
            })
            .attr('y', function (d) {
                return d.y + 18;
            });

        markers.each(function (d) {
            var textSize = d3.select(this).select('text').node().getBBox();
            d3.select(this).select('rect')
                .attr("width", textSize.width + 4)
                .attr("height", textSize.height + 4);
        });
        markers.call(self.drag);
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
            // mousePos = this.playAreaSVG.getSVGCoordinates(pageX,
            //                                               pageY);
            // this.setCoordDisplay(mousePos.x, mousePos.y);
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
    $('#shuffleDeck').on('click', function shuffleDeck() {
        mainApp.playAreaSVG.tableData.shuffleDeck();
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
    $('#createMarker').on('click', function setPlayer() {
        mainApp.playAreaSVG.tableData.createMarker($('#markerText').val());
        mainApp.playAreaSVG.drawMarkers();
    });
});