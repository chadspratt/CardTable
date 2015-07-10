/*global $ */
var mainApp,
    tableStateURL = 'tableState.php';

function TableData() {
    'use strict';
    var self = this;
    this.room = null;
    this.player = { id: null,
                    name: null,
                    backgroundImageUrl: null,
                    zones: [] };
    this.players = {};
    this.decks = {};
    this.tableRadius = 750;
    this.markerHistory = [];
    this.drawDeckFaceDownLedger = {};

    this.setRoom = function (roomName) {
        this.room = roomName;
        $.post(tableStateURL,
                {
                    action: 'set_room',
                    roomName: this.room
                });
    };
    this.setPlayer = function (playerId) {
        // this might not find a newly added or renamed player, but
        // setPlayer will get called again after the player update arrives
        for (var i = 0; i < this.players.length; i++) {
            if(this.players[i].id == playerId) {
                this.player = this.players[i];
                $('#deckBox').show();
                $('#markerBox').show();
                break;
            }
        }
        $('#tableImageUrl').val(this.player.backgroundImageUrl);
        $('#tableImageScale').val(this.player.backgroundImageScale);

        // rearrange player array to start with the selected player
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].id === playerId) {
                var frontPlayers = this.players.splice(0, i);
                this.players = this.players.concat(frontPlayers);
                break;
            }
        }
    };
    this.addPlayer = function (playerName) {
        if (playerName !== '') {
            $.post(tableStateURL,
                    {
                        action: 'add_player',
                        playerName: playerName
                    });
        }
    };
    this.renamePlayer = function (playerId, newName) {
        $.post(tableStateURL,
                {
                    action: 'update_player_name',
                    playerId: playerId,
                    newName: newName,
                });
    };
    this.setTableImageUrl = function (tableImageUrl) {
        if (tableImageUrl !== this.player.imageUrl) {
            $.post(tableStateURL,
                    {
                        action: 'update_table_image_url',
                        playerId: this.player.id,
                        imageUrl: tableImageUrl,
                    });
        }
    };
    this.setTableImageScaleAndDistance = function (imageScale, imageDistance) {
        $.post(tableStateURL,
                {
                    action: 'update_table_image_scale_and_distance',
                    playerId: this.player.id,
                    imageScale: imageScale,
                    imageDistance: imageDistance,
                });
    };
    this.setDeckDealPoint = function (x, y) {
        $.post(tableStateURL,
                {
                    action: 'set_deck_deal_point',
                    playerId: this.player.id,
                    x: x,
                    y: y,
                });
    };
    this.updatePlayerScore = function (id, score) {
        $.post(tableStateURL,
                {
                    action: 'update_player_score',
                    playerId: id,
                    score: score
                });
    };
    this.updateCardGeometry = function (card) {
        $.post(tableStateURL,
                {
                    action: 'update_card_geometry',
                    id: card.id,
                    x: card.x,
                    y: card.y,
                    rotation: card.rotation,
                    ordering: card.ordering
                });
    };
    this.updateMarkerGeometry = function (marker) {
        $.post(tableStateURL,
                {
                    action: 'update_marker_geometry',
                    id: marker.id,
                    x: marker.x,
                    y: marker.y
                });
    };
    this.removePlayer = function (playerId) {
        $.post(tableStateURL,
                {
                    action: 'remove_player',
                    playerId: playerId
                });
    };

    this.processRoomState = function (newData) {
        // replace data
        this.players = newData.results.players;
        this.decks = newData.results.decks;

        this.setPlayer(this.player.id);
    };

    this.addDeckFromCSV = function (deckName, isShared, deckCSV) {
        var cardsWithCounts = $.csv.toObjects(deckCSV);

        var cardNames = [],
            cardImageUrls = [],
            ownerId = null;
        if (!isShared) {
            ownerId = this.player.id;
        };
        for (var i = 0; i < cardsWithCounts.length; i++) {
            var card = cardsWithCounts[i];
            for (var j = 0; j < card.count; j++) {
                cardNames.push(card.name);
                cardImageUrls.push(card.imageUrl);
            }
        }

        $.post(tableStateURL,
                {
                    action: 'add_deck',
                    deckName: deckName,
                    ownerId: ownerId,
                    'cardNames[]': cardNames,
                    'cardImageUrls[]': cardImageUrls
                });
    };
    this.createMarker = function (text) {
        if (this.player.id !== null) {
            var textFound = false;
            for (var i = 0; i < this.markerHistory.length; i++) {
                if(this.markerHistory[i].text === text) {
                    this.markerHistory[i].count += 1;
                    textFound = true;
                    break;
                }
            }

            if (!textFound) {
                this.markerHistory.push({
                    text: text,
                    count: 1
                });
            }

            $.post(tableStateURL,
                    {
                        action: 'add_marker',
                        playerId: this.player.id,
                        text: text,
                        x: this.player.deckDealXPos,
                        y: this.player.deckDealYPos,
                        color: null
                    });
        }
    };
    this.resetPlayer = function () {
        $.post(tableStateURL,
                {
                    action: 'reset_player',
                    playerId: this.player.id,
                });
        this.shuffleDeck();
    };
    this.shuffleDeck = function (deckId) {
        $.post(tableStateURL,
                {
                    action: 'shuffle_deck',
                    deckId: deckId
                });
    };
    this.returnCardsToDeck = function (deckId) {
        $.post(tableStateURL,
                {
                    action: 'return_cards_to_deck',
                    deckId: deckId
                });
    };
    this.removeDeck = function (deckId) {
        $.post(tableStateURL,
                {
                    action: 'remove_deck',
                    deckId: deckId
                });
    };
    this.setDeckSharedStatus = function (deckId, isShared) {
        var ownerId = null;
        if (!isShared) {
            ownerId = this.player.id;
        }
        $.post(tableStateURL,
                {
                    action: 'update_deck_owner',
                    deckId: deckId,
                    ownerId: ownerId
                });
    };
    this.setDeckDrawFaceDownStatus = function (deckId, drawFaceDown) {
        this.drawDeckFaceDownLedger[deckId] = drawFaceDown;
    };
    this.drawCard = function (deckId) {
        if (this.drawDeckFaceDownLedger[deckId]) {
            this.drawCardFaceDown(deckId);
        } else {
            $.post(tableStateURL,
                    {
                        action: 'draw_card',
                        deckId: deckId,
                        playerId: this.player.id
                    });
        }
    };
    this.drawCardFaceDown = function (deckId) {
        $.post(tableStateURL,
                {
                    action: 'draw_card_face_down',
                    deckId: deckId,
                    playerId: this.player.id
                });
    };
    this.drawCardById = function (cardId) {
        this.updateCardZone(cardId, 'hand');
    };
    this.updateCardZone = function (cardId, targetZone, topOrBottom) {
        if (typeof(topOrBottom) === 'undefined') {
            topOrBottom = 'top';
        }
        var playerId = null;
        if (targetZone !== 'deck') {
            playerId = this.player.id;
        }
        $.post(tableStateURL,
                {
                    action: 'update_card_zone',
                    cardId: cardId,
                    playerId: playerId,
                    zone: targetZone,
                    topOrBottom: topOrBottom
                });
    };
    this.updateCardRotation = function (cardId, rotation) {
        $.post(tableStateURL,
                {
                    action: 'update_card_rotation',
                    id: cardId,
                    rotation: rotation
                });
    };
    this.rotateLeft = function (card) {
        card.rotation = (card.rotation - 90) % 360;
        this.updateCardRotation(card.id, card.rotation);
    };
    this.rotateRight = function (card) {
        card.rotation = (card.rotation + 90) % 360;
        this.updateCardRotation(card.id, card.rotation);
    };
    this.unrotatePlayerCards = function () {
        $.post(tableStateURL,
                {
                    action: 'unrotate_player_cards',
                    playerId: this.player.id
                });
    };
    this.updateOwner = function (cardId, newOwnerId, newX, newY) {
        $.post(tableStateURL,
                {
                    action: 'update_card_owner',
                    cardId: cardId,
                    newOwnerId: newOwnerId,
                    newX: newX,
                    newY: newY
                });
    };
    // get the decks owned by this.player and shared decks
    this.getDeckArray = function () {
        var deckArray = [],
            i = 0;
        for (var i = 0; i < this.decks.length; i++) {
            var deck = this.decks[i];
            // playerId is null for shared decks
            if (deck.playerId == this.player.id ||
                deck.playerId == null) {
                deckArray.push(deck);
            }
        }
        return deckArray;
    };
    this.playerExists = function (playerName) {
        var playerExists = false;
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].name === playerName) {
                playerExists = true;
                break;
            }
        }
        return playerExists;
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

    this.viewBox = {left: 0,
                    top: 0,
                    width: 0,
                    height: 0};

    this.scale = 1;
    this.markerSize = 5;
    this.cardSize = 1;
    this.noChangesCount = 0;
    this.sleeping = true;
    this.dragInProgress = false;
    this.playerRotations = {};

    this.cardActionTargetId = null;
    this.deckActionTargetId = null;
    this.playerActionTargetId = null;

    this.cardActionTarget = null;
    this.deckActionTargetRow = null;
    this.playerActionTargetRow = null;

    this.stationaryClickDetected = false;
    this.previousTouch = null;

    this.init = function () {
        var canvasOffset;
        this.svg = d3.select('#playAreaSVG');
        this.resizeSVG();
        window.onresize = this.resizeSVG;
        this.svg.call(this.panTable);
        this.svg.on('click', function () {
            if (self.stationaryClickDetected) {
                d3.select('#enlargedCard image').remove();
                d3.select('#cardButtons').selectAll("*").remove();
                self.stationaryClickDetected = false;
            }
        });
        canvasOffset = $('#playAreaSVG').offset();
        this.x = canvasOffset.left;
        this.y = canvasOffset.top;
        this.tableData = new TableData();
        this.tableData.setRoom($('#roomName').val());
        self.hideActionBoxes();
    };

    this.panTable = d3.behavior.zoom();
    this.panTable.on('zoomstart', function(d) {
        self.stationaryClickDetected = true;
        if (d3.event.sourceEvent.type == 'touchmove' &&
            d3.event.sourceEvent.touches.length == 1) {
            self.previousTouch = d3.event.sourceEvent.touches[0];
        }
    });
    this.panTable.on('zoom', function(d) {
        mainApp.coordDisplay.html('<' + d3.event.translate[0] + ', ' + d3.event.translate[1] + '>x' + d3.event.scale);
        self.stationaryClickDetected = false;
        var sourceEvent = d3.event.sourceEvent;
        // d3.event.sourceEvent.stopPropagation();
        // check if the scale has changed, within a margin of error
        if (Math.round((self.scale - d3.event.scale) * 1000) != 0) {
            self.previousTouch = null;
            var zoomFocalPoint = null;
            if (sourceEvent.type == 'wheel') {
                zoomFocalPoint = self.getSVGCoordinates(
                    sourceEvent.pageX,
                    sourceEvent.pageY);
            } else if (sourceEvent.type == 'touchmove') {
                var pageXAverage = (sourceEvent.touches[0].pageX + sourceEvent.touches[1].pageX) / 2,
                    pageYAverage = (sourceEvent.touches[0].pageY + sourceEvent.touches[1].pageY) / 2;
                zoomFocalPoint = self.getSVGCoordinates(
                    pageXAverage,
                    pageYAverage);
            }
            var scaleFactor = d3.event.scale / self.scale;
            self.scale = d3.event.scale;

            self.viewBox.left = zoomFocalPoint.x - (zoomFocalPoint.x - self.viewBox.left) / scaleFactor;
            self.viewBox.top = zoomFocalPoint.y - (zoomFocalPoint.y - self.viewBox.top) / scaleFactor;
            self.viewBox.width = self.svgWidth / self.scale;
            self.viewBox.height = self.svgHeight / self.scale;

            d3.event.translate[0] = 0;
            d3.event.translate[1] = 0;
        }
        else
        {
            if (d3.event.sourceEvent.type == 'mousemove') {
                if (d3.event.sourceEvent.movementX !== undefined) {
                    self.viewBox.left -= d3.event.sourceEvent.movementX / self.scale;
                    self.viewBox.top -= d3.event.sourceEvent.movementY / self.scale;
                } else if (d3.event.sourceEvent.mozMovementX !== undefined)  {
                    self.viewBox.left -= d3.event.sourceEvent.mozMovementX / self.scale;
                    self.viewBox.top -= d3.event.sourceEvent.mozMovementY / self.scale;
                }
            } else if (sourceEvent.type == 'touchmove') {
                if (self.previousTouch !== null) {
                    var dx = sourceEvent.touches[0].pageX - self.previousTouch.pageX,
                        dy = sourceEvent.touches[0].pageY - self.previousTouch.pageY;
                    self.viewBox.left -= dx / self.scale;
                    self.viewBox.top -= dy / self.scale;
                }
                self.previousTouch = sourceEvent.touches[0];
            }
        }
        self.applyViewBox();
        // mainApp.setCoordDisplay(d3.event.translate[0], d3.event.translate[1]);
    });
    this.panTable.on('zoomend', function(d) {
        self.previousTouch = null;
    });
    this.getSVGCoordinates = function (pageX, pageY) {
        return {
            x: Math.round(this.viewBox.left + pageX / this.scale),
            y: Math.round(this.viewBox.top + pageY / this.scale)
        };
    };
    this.drag = d3.behavior.drag();
    this.drag.on('dragstart', function(d) {
        self.dragInProgress = true;
        self.dragOffset = {x: null,
                           y: null};
        d3.event.sourceEvent.stopPropagation();
        var drugObject = d3.select(this),
            parent = d3.select($(this).parent()[0]);
        if (drugObject.classed('enlarged')) {
            d.clicked = true;
            drugObject = d3.select('[player="' + d.playerId + '"]' +
                                   '[card_id="' + d.id + '"]')
            parent = d3.select($(drugObject[0][0]).parent()[0]);
        } else {
            d3.select('#enlargedCard image').remove();
        }
        d3.select('#cardButtons').selectAll("*").remove();
        // put the card on top of other cards in its group
        var newOrdering = 0,
            siblings = parent.selectAll('image');
            siblings.each(function (d) {
            if (d.ordering >= newOrdering) {
                newOrdering = d.ordering + 1;
            }
        });

        d.ordering = newOrdering;

        siblings.sort(function(a, b) {
            return a.ordering - b.ordering;
        });
    });
    this.drag.on('drag', function (d) {
        // d3.event.sourceEvent.stopPropagation();
        // d3.select('#cardButtons').selectAll("*").remove();
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
            drugObject.style('opacity', '0.0');

            d.enlargedX = d3.event.x + self.dragOffset.enlargedX;
            d.enlargedY = d3.event.y + self.dragOffset.enlargedY;

            drugObject
                .attr('x', d.enlargedX)
                .attr('y', d.enlargedY)
                .attr('transform', function (d) {
                    var imgCenterX = d.x + d.width / 2,
                        imgCenterY = d.y + d.height / 2,
                        rotation = -1 * self.playerRotations[d.playerId].degrees;
                    return 'rotate(' + rotation + ' ' +
                                       imgCenterX + ' ' +
                                       imgCenterY + ')';
                });

            // move source card beneath enlarged
            drugObject = d3.select('[player="' + d.playerId + '"]' +
                                   '[card_id="' + d.id + '"]')
        }

        if (drugObject.classed('marker')) {
            var markerRect = drugObject.select('rect'),
                markerText = drugObject.select('text');
            markerRect.attr('x', d.x)
                .attr('y', d.y);
            markerText.attr('x', d.x + self.markerSize * 1.5)
                .attr('y', d.y + self.markerSize * 14);
        } else {
            var imgCenterX = d.x + d.width / 2,
                imgCenterY = d.y + d.height / 2;
            drugObject
                .attr('x', d.x)
                .attr('y', d.y)
                .attr('transform', function (d) {
                    return 'rotate(' + d.rotation + ' ' +
                                       imgCenterX + ' ' +
                                       imgCenterY + ')';
                });
        }
    });
    this.drag.on('dragend', function (d) {
        self.dragInProgress = false;
        var drugObject = d3.select(this);
        if (drugObject.classed('enlarged')) {
            drugObject.style('opacity', '1.0');
            d.originCard
        }
        if (!d.clicked) {
            if (drugObject.classed('marker')) {
                self.tableData.updateMarkerGeometry(d);
            } else {
                self.tableData.updateCardGeometry(d);
            }
        }
        mainApp.updateFromServer();
    });
    this.drawTable = function () {
        var playerArray = this.tableData.players;
        var players = d3.select('#tableGraphic').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g').append('image');
        players
            .attr('transform', function (d, i) {
                var rotation = 360 / playerArray.length * i,
                    yOffset = -1 * self.tableData.tableRadius * (playerArray.length);

                return 'rotate(' + rotation + ' 0 ' + yOffset + ')';
            });
        players.select('image')
            .attr('xlink:href', function (d) {
                // this will be a broken link for unset players
                return d.backgroundImageUrl;
            })
            .style('display', function (d) {
                // this is a crude filter for unset values (which will be '0')
                if (d.backgroundImageUrl != null) {
                    return ""
                } else {
                    return "none"
                }
            })
            .attr('x', function (d) {
                return -2250 * d.backgroundImageScale;
            })
            .attr('y', function (d) {
                return -1200 * d.backgroundImageScale;
            })
            .attr('width', function (d) {
                return 4500 * d.backgroundImageScale;
            })
            .attr('height', function (d) {
                return 2400 * d.backgroundImageScale;
            });
        players.exit().remove();
    };
    this.drawCards = function () {
        var playerArray = this.tableData.players;
        var players = d3.select('#players').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g');
        players
            .attr('transform', function (d, i) {
                var rotation = 360 / playerArray.length * i,
                    yOffset = -1 * self.tableData.tableRadius * (playerArray.length);
                self.playerRotations[d.id] = {
                    degrees: rotation,
                    radians: rotation  * (Math.PI / 180),
                    yOffset: yOffset};

                return 'rotate(' + rotation + ' 0 ' + yOffset + ')';
            });
        players.exit().remove();

        var zones = players.selectAll('g')
            .data(function (d) {
                    var zones = [];
                    if (d.id == self.tableData.player.id) {
                        zones = d.zones;
                    } else {
                        // don't draw other player's hands
                        for (var zone in d.zones) {
                            if (zone != 'hand') {
                                    zones.push({
                                        name: d.zones[zone].name,
                                        cards: d.zones[zone].cards});
                            }
                        }
                    }
                    return zones;
                },
                function (d) { return d.name; });
        zones.enter().append('g')
            .classed('cards_in_hand',
                    function (d) { return d.name === 'hand'; })
            .classed('cards_in_play',
                    function (d) { return d.name === 'inPlay'; })
            .classed('cards_in_play_face_down',
                    function (d) { return d.name === 'inPlayFaceDown'; })
            .classed('cards_dealt_face_down',
                    function (d) { return d.name === 'dealtFaceDown'; });
        zones.exit().remove();

        var cards = zones.selectAll('image')
            .data(function (d) {
                    return d.cards;
                },
                function (d) {
                    return d.id;
                });

        cards.enter().append('image')
            .attr('player', function (d) {
                return d.playerId;
            })
            .attr('card_id', function (d) {
                return d.id;
            })
            .attr('xlink:href', function (d) {
                if (d.zone !== 'dealtFaceDown' &&
                    (d.zone !== 'inPlayFaceDown' ||
                     d.playerId === self.tableData.player.id)) {
                    return d.imageUrl;
                } else {
                    return 'cardback.png';
                }
            })
            .attr('x', function (d, i) {
                if (!d.hasOwnProperty('x')) {
                    d.x = 0;
                }
                return d.x;
            })
            .attr('y', function (d) {
                if (!d.hasOwnProperty('y')) {
                    d.y = 0;
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
                return 'rotate(' + d.rotation + ' ' +
                                   imgCenterX + ' ' +
                                   imgCenterY + ')';
            })
            .call(this.drag);
        cards.exit().remove();
        cards.sort(function (a, b) {
            return a.ordering - b.ordering;
        });
        cards.on('click.enlarge', self.drawEnlargedCard);
        cards.on('click.touchMenu', self.showCardActionMenu);
        cards.on('contextmenu', self.showCardActionMenu);
    };
    this.drawMarkers = function () {
        var playerArray = this.tableData.players;
        var players = d3.select('#markers').selectAll('g')
            .data(playerArray,
                  function (d) { return d.name; });
        players.enter().append('g');
        players
            .attr('transform', function (d, i) {
                var rotation = 360 / playerArray.length * i,
                    yOffset = -1 * self.tableData.tableRadius * (playerArray.length);

                return 'rotate(' + rotation + ' 0 ' + yOffset + ')';
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
                var size = self.markerSize;
                // var size = 1 / self.scale;
                return size + 'em';
            })
            .attr('x', function (d) {
                return d.x + self.markerSize * 1.5;
                // return d.x + (2 / self.scale);
            })
            .attr('y', function (d) {
                return d.y + self.markerSize * 14;
                // return d.y + (18 / self.scale);
            });

        markers.each(function (d) {
            var textSize = d3.select(this).select('text').node().getBBox();
            d3.select(this).select('rect')
                .attr("width", textSize.width + self.markerSize * 3.5)
                .attr("height", textSize.height - self.markerSize * 1.2);
        });
        markers.call(self.drag);
    };
    this.drawEnlargedCard = function (d) {
        d3.event.stopPropagation();
        var originCard = d3.select(this);
        d.originCard = originCard;

        if (d.zone !== 'dealtFaceDown' &&
            (d.zone !== 'inPlayFaceDown' ||
             d.playerId === self.tableData.player.id)) {
            var enlargedScale = self.scale / self.cardSize,
                enlargedCardZone = d3.select('#enlargedCard'),
                player = d3.select(d.originCard[0][0].parentNode.parentNode);

            enlargedCardZone
                .attr('transform', function (d) {
                    return player.attr('transform');
                });
            var newCardData = enlargedCardZone.selectAll('image')
                    .data([d], function (d) {return d.imageUrl; });
            mainApp.enlargedCard = newCardData.enter().append('image');
            mainApp.enlargedCard
                .classed('enlarged', true)
                .attr('transform', function (d) {
                    var imgCenterX = d.x + d.width / 2,
                        imgCenterY = d.y + d.height / 2,
                        rotation = -1 * self.playerRotations[d.playerId].degrees;
                    return 'rotate(' + rotation + ' ' +
                                       imgCenterX + ' ' +
                                       imgCenterY + ')';
                })
                .attr('xlink:href', function (d) {
                    return d.imageUrl;
                })
                .attr('x', function (d) {
                    d.enlargedX = d.x + (d.width * enlargedScale - d.width) / (2 * enlargedScale);
                    return d.enlargedX;
                })
                .attr('y', function (d) {
                    d.enlargedY = d.y + (d.height * enlargedScale - d.height) / (2 * enlargedScale);
                    return d.enlargedY;
                })
                .attr('width', function (d) {
                    d.enlargedWidth = d.width / enlargedScale;
                    return d.enlargedWidth;
                })
                .attr('height', function (d) {
                    d.enlargedHeight = d.height / enlargedScale;
                    return d.enlargedHeight;
                });
            mainApp.enlargedCard.call(self.drag);
            newCardData.exit().remove();

            self.hideActionBoxes();

            mainApp.enlargedCard.on('click', function (d) {
                d3.event.stopPropagation();
                self.hideActionBoxes();
            });
            mainApp.enlargedCard.on('contextmenu', self.showCardActionMenu);
        }
    };
    this.showCardActionMenu = function (d) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        if(self.tableData.player.id === d.playerId ||
           d.zone == 'dealtFaceDown')
        {
            self.cardActionTargetId = d.id;
            self.cardActionTarget = d;

            d3.selectAll('#cardActionBox div')
                .style('display', 'none');
            d3.selectAll('.' + d.zone)
                .style('display', '');

            // move box on-screen
            self.hideActionBoxes();

            d3.select('#cardActionBox')
                .classed('mobileCardActions', d3.event.type == 'click');

            if (d3.event.type == 'contextmenu') {
                d3.select('#cardActionBox')
                    .style('left', d3.event.pageX + 'px')
                    .style('bottom', '')
                    .style('top', d3.event.pageY + 'px')
                    .style('width', '')
                    .style('display', '');
            } else {
                d3.select('#cardActionBox')
                    .style('left', '0px')
                    .style('bottom', '0px')
                    .style('top', '')
                    .style('width', '100%');
            }
        }
    }
    this.drawScoreBoard = function () {
        var playerArray = this.tableData.players;

        var players = d3.select('#scoreBoard tbody').selectAll('tr')
            .data(playerArray,
                  function (d) {
                    return d.id;
                });
        var newPlayers = players.enter().append('tr')
            .classed('player', true);

        newPlayers.each(function (d) {
            var playerRow = d3.select(this);
            playerRow.append('td')
                .classed('name', true)
                .html(function (d) {
                    return d.name;
                });
            playerRow.append('td').append('span')
                .classed('cardCount', true);
            playerRow.append('td').append('button')
                .classed('decrementScore', true)
                .html('-')
                .on('click', function (d) {
                    d.score -= 1;
                    self.tableData.updatePlayerScore(d.id, d.score);
                });
            playerRow.append('td').append('input')
                .classed('score', true)
                .attr('size', 1)
                .on('input', function (d) {
                    d.score = parseInt(this.value);
                    self.tableData.updatePlayerScore(d.id, d.score);
                });
            playerRow.append('td').append('button')
                .classed('incrementScore', true)
                .html('+')
                .on('click', function (d) {
                    d.score += 1;
                    self.tableData.updatePlayerScore(d.id, d.score);
                });
            playerRow.append('td').append('button')
                .html('▼')
                .on('click', function (d) {
                    d3.event.stopPropagation();
                    // can't just assign 'd' because it is statically fixed
                    // by the each() so the cards won't update
                    self.playerActionTargetId = d.id;
                    self.playerActionTargetRow = playerRow;
                    // move box on-screen
                    self.hideActionBoxes();
                    d3.select('#playerActionBox')
                        .style('left', d3.event.pageX + 'px')
                        .style('top', d3.event.pageY + 'px');
                    // $('#playerName').val(d.name);
                    // $('#playerName').trigger('input');
                });
        });

        players.each(function (d) {
            var row = d3.select(this);
            row.select('.score')
                .attr('value', d.score);

            row.select('.cardCount')
                .html(function (d) {
                    var cardCount = 0;
                    for (var i = 0; i < d.zones.length; i++) {
                        if(d.zones[i].name === 'hand') {
                            cardCount = d.zones[i].cards.length;
                            break;
                        }
                    }
                    return cardCount;
                });
        });
        players.exit().remove();
    };
    this.drawDeckList = function () {
        var deckArray = this.tableData.getDeckArray();

        var decks = d3.select('#deckTable tbody').selectAll('tr')
            .data(deckArray, function (d) {
                return d.id;
            });
        var newDecks = decks.enter().append('tr');

        newDecks.each(function (d) {
            var deckRow = d3.select(this);
            d.drawFaceDown = false;
            deckRow.append('td')
                .classed('name', true)
                .html(function (d) {
                    return d.name;
                });
            deckRow.append('td').append('span')
                .classed('cardCount', true);
            deckRow.append('td').append('button')
                .classed('drawCardFromDeck', true)
                .html('Draw')
                .on('click', function () {
                    d3.select('#enlargedCard').selectAll("*").remove();
                    self.tableData.drawCard(d.id);
                });
            deckRow.append('td').append('button')
                .html('▼')
                .on('click', function (d) {
                    d3.event.stopPropagation();
                    // can't just assign 'd' because it is statically fixed
                    // by the each() so the cards won't update
                    self.deckActionTargetId = d.id;
                    self.deckActionTargetRow = deckRow;
                    if (d.playerId === null) {
                        d3.select('#deckIsShared input')
                            .property('checked', 'checked')
                    } else {
                        d3.select('#deckIsShared input')
                            .property('checked', '')
                    }
                    // move box on-screen
                    self.hideActionBoxes();
                    d3.select('#deckActionBox')
                        .style('left', d3.event.pageX + 'px')
                        .style('top', d3.event.pageY + 'px');
                });
        });

        decks.each(function (d) {
            var row = d3.select(this);

            row.select('.cardCount')
                .html(function (d) {
                    return d.cards.length;
                });
        });
        decks.exit().remove();
    };
    this.drawCardList = function () {
        if (this.deckActionTargetId !== null) {
            var sortedDeck = [];
            for (var i = 0; i < self.tableData.decks.length; i++) {
                if(self.tableData.decks[i].id === this.deckActionTargetId) {
                    cards = self.tableData.decks[i].cards;
                    break;
                }
            }

            var cards = d3.select('#deckList').selectAll('option')
                .data(cards, function (d) {
                       return d.id;
                   });
            cards.enter().append('option')
                .attr('value', function (d) {
                    return d.id;
                })
                .html(function (d) {
                    // return d.id;
                    return d.name;
                });

            cards.exit().remove();

            cards.sort(function (a, b) {
                // if (a.id < b.id) {
                if (a.name < b.name) {
                    return -1;
                // } else if (a.id > b.id) {
                } else if (a.name > b.name) {
                    return 1;
                } else {
                    return 0;
                }
            });
        }
    };
    this.drawMarkerHistory = function () {
        // populate marker history with current player's markers
        if (this.tableData.markerHistory.length === 0 &&
            this.tableData.player.id !== null) {
            for (var i = 0; i < this.tableData.player.markers.length; i++) {
                var marker = this.tableData.player.markers[i],
                    textFound = false;
                for (var j = 0; j < this.tableData.markerHistory.length; j++) {
                    if(this.tableData.markerHistory[j].text === marker.text) {
                        this.tableData.markerHistory[j].count += 1;
                        textFound = true;
                        break;
                    }
                }
                if (!textFound) {
                    this.tableData.markerHistory.push({
                        text: marker.text,
                        count: 1
                    });
                }
            }
        }
        var history = d3.select('#markerHistory').selectAll('tr')
            .data(this.tableData.markerHistory, function (d) {
                   return d.text;
               });
        var newHistory = history.enter().append('tr');

        newHistory.each(function (d) {
            var playerRow = d3.select(this);
            playerRow.append('td').html(function (d) { return d.text; });
            playerRow.append('td').append('button')
                .classed('insertMarker', true)
                .html('+')
                .on('click', function () {
                    self.tableData.createMarker(d.text);
                });
        });

        history.exit().remove();
        history.sort(function (a, b) {
                return b.count - a.count;
        });
    };
    this.hideActionBoxes = function () {
        d3.selectAll('.actionBox').each(function () {
            d3.select(this)
                .style('left', '-1000px')
                .style('top', '-1000px');
        })
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

    this.updateOwner = function (card, newOwnerId) {
        var cardCenter = {
                x: card.x + card.width / 2,
                y: card.y + card.height / 2
            },
            currentTransform = this.playerRotations[card.playerId],
            newTransform = this.playerRotations[newOwnerId],
            // undo current transform
            radians = -currentTransform.radians,
            rotationCenter = {
                x: 0,
                y: currentTransform.yOffset
            },
            cos = Math.cos(radians),
            sin = Math.sin(radians),
            nx = (cos * (cardCenter.x - rotationCenter.x)) -
                 (sin * (cardCenter.y - rotationCenter.y)) +
                  rotationCenter.x,
            ny = (sin * (cardCenter.x - rotationCenter.x)) +
                 (cos * (cardCenter.y - rotationCenter.y)) +
                  rotationCenter.y;
        // apply new transform
        radians = newTransform.radians;
        rotationCenter = {
            x: 0,
            y: newTransform.yOffset
        };
        cos = Math.cos(radians);
        sin = Math.sin(radians);
        nx = (cos * (nx - rotationCenter.x)) -
             (sin * (ny - rotationCenter.y)) +
              rotationCenter.x;
        ny = (sin * (nx - rotationCenter.x)) +
             (cos * (ny - rotationCenter.y)) +
              rotationCenter.y;

        nx -= card.width / 2;
        ny -= card.height / 2;

        this.tableData.updateOwner(card.id, newOwnerId, nx, ny);
    };

    this.zoomIn = function (pageX, pageY) {
        var zoomFactor = 1.1;
        this.scale *= zoomFactor;
        this.viewBox.left += (pageX - this.x) / this.scale * (zoomFactor - 1);
        this.viewBox.top += (pageY - this.y) / this.scale * (zoomFactor - 1);
        this.viewBox.width = this.viewBox.width / zoomFactor;
        this.viewBox.height = this.viewBox.height / zoomFactor;
        this.applyViewBox();
        // self.scaleSelectedCard();
    };
    this.zoomOut = function (pageX, pageY) {
        var zoomFactor = 1 / 1.1;
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
}

function MainApp() {
    'use strict';
    var self = this;
    this.playAreaSVG = null;
    this.coordDisplay = null;
    this.enlargedCard = null;
    this.mouseIsDown = false;
    this.sleeping = true;
    this.noChangesCount = 0;

    this.init = function () {
        this.playAreaSVG = new PlayAreaSVG();
        this.playAreaSVG.init();
        this.coordDisplay = $('#coordDisplay');
        this.enlargedCard = $('#enlargedCard');
        this.updateFromServer(true);
    };

    this.updateFromServer = function (initial) {
        if (this.playAreaSVG.tableData.room !== null
            & this.sleeping) {
            this.sleeping = false;
            var args = {
                action: 'get_state',
                roomName: this.playAreaSVG.tableData.room
            }
            if (initial) {
                args.lastUpdateId = -1;
            }
            $.post(tableStateURL,
                    args,
                    function (data) {
                        // don't update while something is being drug
                        if (self.playAreaSVG.dragInProgress) {
                            self.sleeping = true;
                        } else {
                            if (!data.hasOwnProperty('no_changes') &&
                                !self.playAreaSVG.dragInProgress) {
                                self.noChangesCount = 0;
                                self.playAreaSVG.tableData.processRoomState(data);
                                self.redraw();
                            } else {
                                self.noChangesCount += 1;
                            }
                            // sleep after 20 minutes of inactivity
                            // wake by dragging a card
                            // XXX mention all this somewhere on the page
                            self.sleeping = true;
                            if (self.noChangesCount < 20) {
                                self.updateFromServer();
                            }
                        }
                    },
                    'json')
            .fail(function () {
                self.sleeping = true;
                self.updateFromServer();
            });
        }
    };
    this.redraw = function () {
        self.playAreaSVG.drawTable();
        self.playAreaSVG.drawCards();
        self.playAreaSVG.drawMarkers();
        self.playAreaSVG.drawScoreBoard();
        self.playAreaSVG.drawDeckList();
        self.playAreaSVG.drawCardList();
        self.playAreaSVG.drawMarkerHistory();
    }
    this.setCoordDisplay = function (x, y) {
        this.coordDisplay.html('x: ' + x + ' y: ' + y);
    };
}


$(document).ready(function initialSetup() {
    'use strict';
    mainApp = new MainApp();
    mainApp.init();

    $('.interfaceIcon').on('click', function toggleInterfaceSection() {
        var icon = $(this),
            content = icon.next('.interfaceContent');
        icon.find('.sectionLabel').toggle();
        icon.find('.sectionHideLabel').toggle();
        // icon.hide();
        content.toggle();
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

    $('#deckBox').hide();
    $('#markerBox').hide();
    $('#deckListBox').hide();
    $('#showDeckList').on('click', function showLoadDeckForm() {
        $('#deckListBox').toggle();
    });
    $('#addPlayerBox').hide();
    $('#addPlayerHeader').on('click', function showLoadDeckForm() {
        $('#addPlayerBox').toggle();
        if ($.trim($(this).text()) == 'Add Player') {
            $(this).text('Hide Form');
        } else {
            $(this).text('Add Player');
        }
    });
    $('#addPlayer').on('click', function passCSVToTableData() {
        var playerName = $('#playerName').val();
        mainApp.playAreaSVG.tableData.addPlayer(playerName);
        $('#addPlayerBox').hide();
    });

    $('#addDeckBox').hide();
    $('#addDeckHeader').on('click', function showLoadDeckForm() {
        $('#addDeckBox').toggle();
        if ($.trim($(this).text()) == 'Add Deck') {
            $(this).text('Hide Form');
        } else {
            $(this).text('Add Deck');
        }
    });
    $('#addDeck').on('click', function passCSVToTableData() {
        var deckName = $('#deckName').val(),
            isShared = $('#newDeckIsShared').prop('checked'),
            deckCSV = $('#deckCSV').val();
        mainApp.playAreaSVG.tableData.addDeckFromCSV(deckName,
                                                     isShared,
                                                     deckCSV);
        $('#addDeckBox').hide();
    });

    $('#markerHistory').hide();
    $('#markerHistoryHeader').on('click', function showLoadDeckForm() {
        $('#markerHistory').toggle();
    });

    $('#drawSelectedCard').on('click', function drawCard() {
        var selectedCardId = d3.select('#deckList').property('value');
        mainApp.playAreaSVG.tableData.drawCardById(selectedCardId);
    });

    $('#setRoom').on('click', function setRoom() {
        mainApp.playAreaSVG.tableData.setRoom($('#roomName').val());
    });

    $('#setTableImageUrl').on('click', function setTableImageUrl() {
        mainApp.playAreaSVG.tableData.setTableImageUrl($('#tableImageUrl').val());
    });
    $('#setTableScaleAndDistance').on('click', function setTableRadius() {
        mainApp.playAreaSVG.tableData.setTableImageScaleAndDistance(
            $('#tableImageScale').val(),
            $('#tableDistance').val());
    });
    $('#createMarker').on('click', function createMarker() {
        mainApp.playAreaSVG.tableData.createMarker($('#markerText').val());
    });
    $('#setMarkerSize').on('click', function setMarkerSize() {
        mainApp.playAreaSVG.markerSize = $('#markerSize').val();
        mainApp.playAreaSVG.drawMarkers();
    });
    $('#setCardSize').on('click', function setCardSize() {
        mainApp.playAreaSVG.cardSize = $('#cardSize').val();
    });
    $('#setDeckDealPoint').on('click', function setCardSize() {
        mainApp.playAreaSVG.tableData.setDeckDealPoint($('#deckDealX').val(),
                                                       $('#deckDealY').val());
    });

// hide action boxes when anything is clicked on (except the summoning element)
    d3.select('body').on('click.hideActionBox', function hideDeckActions() {
        mainApp.playAreaSVG.hideActionBoxes();
    });
    // undo checkbox toggles, the enclosing div click handler will do it
    d3.select('.actionBox input').on('click', function logCheckboxClick() {
        var checkbox = d3.select(this);
        if (checkbox.property('checked')) {
            checkbox.property('checked', false);
        } else {
            checkbox.property('checked', true);
        }
    });

// card actions
    d3.select('#playCard').on('click', function playCard() {
        var card = mainApp.playAreaSVG.cardActionTarget;
        if (card.playerId !== mainApp.playAreaSVG.tableData.player.id) {
            mainApp.playAreaSVG.updateOwner(
                card,
                mainApp.playAreaSVG.tableData.player.id);
        }
        mainApp.playAreaSVG.tableData.updateCardZone(card.id,
                                                     'inPlay');
    });
    d3.select('#rotateCardLeft').on('click', function rotateCardLeft() {
        var card = mainApp.playAreaSVG.cardActionTarget;
        mainApp.playAreaSVG.tableData.rotateLeft(card);
    });
    d3.select('#rotateCardRight').on('click', function rotateCardRight() {
        var card = mainApp.playAreaSVG.cardActionTarget;
        mainApp.playAreaSVG.tableData.rotateRight(card);
    });
    d3.select('#unrotateAllOwnCards').on('click', function unrotateAllOwnCards() {
        var cardId = mainApp.playAreaSVG.cardActionTargetId;
        mainApp.playAreaSVG.tableData.unrotatePlayerCards();
    });
    d3.select('#playCardFaceDown').on('click', function playCardFaceDown() {
        var cardId = mainApp.playAreaSVG.cardActionTargetId;
        mainApp.playAreaSVG.tableData.updateCardZone(cardId,
                                                     'inPlayFaceDown');
    });
    d3.select('#moveCardToHand').on('click', function moveCardToHand() {
        var card = mainApp.playAreaSVG.cardActionTarget;
        if (card.playerId !== mainApp.playAreaSVG.tableData.player.id) {
            mainApp.playAreaSVG.updateOwner(
                card,
                mainApp.playAreaSVG.tableData.player.id);
        }
        mainApp.playAreaSVG.tableData.updateCardZone(card.id,
                                                     'hand');
    });
    d3.select('#moveCardToTopOfDeck').on('click', function moveCardToTopOfDeck() {
        var cardId = mainApp.playAreaSVG.cardActionTargetId;
        mainApp.playAreaSVG.tableData.updateCardZone(cardId,
                                                     'deck',
                                                     'top');
    });
    d3.select('#moveCardToBottomOfDeck').on('click', function moveCardToBottomOfDeck() {
        var cardId = mainApp.playAreaSVG.cardActionTargetId;
        mainApp.playAreaSVG.tableData.updateCardZone(cardId,
                                                     'deck',
                                                     'bottom');
    });

// deck actions
    d3.select('#shuffleDeck').on('click', function shuffleDeck() {
        var deckId = mainApp.playAreaSVG.deckActionTargetId;
        mainApp.playAreaSVG.tableData.shuffleDeck(deckId);
    });
    d3.select('#listDeck').on('click', function listDeck() {
        mainApp.playAreaSVG.drawCardList();
        $('#deckListBox').show();
    });
    d3.select('#hideCardList').on('click', function hideCardList() {
        $('#deckListBox').hide();
    });
    d3.select('#returnCardsToDeck').on('click', function returnCardsToDeck() {
        var deckId = mainApp.playAreaSVG.deckActionTargetId;
        mainApp.playAreaSVG.tableData.returnCardsToDeck(deckId);
    });
    d3.select('#removeDeck').on('click', function removeDeck() {
        var deckId = mainApp.playAreaSVG.deckActionTargetId;
        mainApp.playAreaSVG.tableData.removeDeck(deckId);
    });
    d3.select('#deckIsShared').on('click', function changeDeckSharing() {
        var deckId = mainApp.playAreaSVG.deckActionTargetId,
            isSharedCheckbox = d3.select('#deckIsShared input'),
        // toggle the checkbox
            isShared = !isSharedCheckbox.property('checked');
        isSharedCheckbox.property('checked', isShared);
        mainApp.playAreaSVG.tableData.setDeckSharedStatus(deckId, isShared);
    });
    d3.select('#drawFaceDown').on('click', function changeDeckSharing() {
        var deckId = mainApp.playAreaSVG.deckActionTargetId,
            drawFaceDownCheckbox = d3.select('#drawFaceDown input'),
        // toggle the checkbox
            drawFaceDown = !drawFaceDownCheckbox.property('checked');
        drawFaceDownCheckbox.property('checked', drawFaceDown);
        mainApp.playAreaSVG.tableData.setDeckDrawFaceDownStatus(deckId, drawFaceDown);
    });

// player actions
    d3.select('#selectPlayer').on('click', function selectPlayer() {
        var playerId = mainApp.playAreaSVG.playerActionTargetId;
        mainApp.playAreaSVG.tableData.setPlayer(playerId);
        mainApp.redraw();
    });
    d3.select('#resetPlayer').on('click', function resetPlayer() {
        var playerId = mainApp.playAreaSVG.playerActionTargetId;
        mainApp.playAreaSVG.tableData.resetPlayer(playerId);
    });
    d3.select('#renamePlayer').on('click', function showPlayerRenameForm() {
        var playerId = mainApp.playAreaSVG.playerActionTargetId,
            playerRow = mainApp.playAreaSVG.playerActionTargetRow,
            nameCell = playerRow.select('td.name'),
            currentName = nameCell.text();
        nameCell.html('');
        nameCell.append('input')
            .attr('value', currentName)
            .on('input', function () {
                if (mainApp.playAreaSVG.tableData.playerExists(this.value)) {
                    nameCell.select('button.setName').attr('disabled', 'disabled');
                } else {
                    nameCell.select('button.setName').attr('disabled', null);
                }
            });
        nameCell.append('button')
            .classed('setName', true)
            .text('Set')
            .attr('disabled', 'disabled')
            .on('click', function () {
                var newName = nameCell.select('input').property('value');
                mainApp.playAreaSVG.tableData.renamePlayer(playerId, newName);
                nameCell.text(newName);
            });
        nameCell.append('button')
            .text('Cancel')
            .on('click', function () {
                nameCell.text(currentName);
            });
    });
    d3.select('#removePlayer').on('click', function removePlayer() {
        var playerId = mainApp.playAreaSVG.playerActionTargetId;
        mainApp.playAreaSVG.tableData.removePlayer(playerId);
    });
});