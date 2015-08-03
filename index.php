<!DOCTYPE html>
<html lang="en-US">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

<head>
  <link rel="stylesheet" media="(min-width: 401px)"  type="text/css" href="./style.css">
  <link rel="stylesheet" media="(max-width: 400px)" type="text/css" href="./mobile.css">
  <!-- third party javascript -->
  <script src="./js/jquery-2.1.3.js"></script>
  <script src="./js/jquery.mousewheel.js"></script>
  <script src="./js/jquery.form.js"></script>
  <script src="./js/jquery.csv-0.71.js"></script>

  <script src="./js/d3.js"></script>

  <script src="./js/drawPlayArea.js"></script>
</head>

<body>

<svg id="playAreaSVG">
  <g id="tableGraphic"></g>
  <g id="cardFrames"></g>
  <g id="players"></g>
  <g id="markers"></g>
  <g id="enlargedCard"></g>
</svg>

<div id="coordDisplay" class="overlayItem">x: y:</div>

<div id="gameControls" class="overlayItem">
  <div id="roomNameBox" class="interfaceSection">
    <div class="interfaceIcon">
      <span class="sectionLabel">Room</span>
      <span class="sectionHideLabel links">Hide</span>
    </div>

    <div class="interfaceContent">
      Room:
      <input id="roomName" type="text" size="12" value="<?php
        if (isset($_GET["room"]))
          { echo $_GET["room"]; }
        else { echo "Room"; } ?>">
      <button id="setRoom">Join</button>
    </div>
  </div>

  <div id="scoreBoardBox" class="interfaceSection">
    <div class="interfaceIcon">
      <span class="sectionLabel">Players</span>
      <span class="sectionHideLabel links">Hide</span>
    </div>

    <div class="interfaceContent">
      <table id="scoreBoard">
        <h4>Players</h4>

        <thead>
          <tr>
            <td>Name</td>
            <td>Hand</td>
            <td> </td>
            <td>Score</td>
            <td> </td>
            <td> </td>
          </tr>
        </thead>

        <tbody></tbody>
      </table>

      <span id="addPlayerHeader" class="links">Add Player</span>

      <div id="addPlayerBox">
        Name:<input id="playerName" type="text" value="" size="12">
        <button id="addPlayer">Add Player</button>
      </div>
    </div>
  </div>

  <div id="deckBox" class="interfaceSection">
    <div class="interfaceIcon">
      <span class="sectionLabel">Decks</span>
      <span class="sectionHideLabel links">Hide</span>
    </div>

    <div class="interfaceContent">
      <h4>Decks</h4>
      <table id="deckTable">
        <thead>
          <tr>
            <td>Name</td>
            <td>Count</td>
            <td> </td>
            <td> </td>
            <td> </td>
          </tr>
        </thead>

        <tbody></tbody>
      </table>

      <span id="addDeckHeader" class="links">Add Deck</span>

      <div id="addDeckBox">
        <select id="addDeckSelect">
          <?php $defaultDecks = scandir("decks");
           $defaultDecks = array_diff($defaultDecks, array('..', '.'));
           var_dump($defaultDecks);
           foreach ($defaultDecks as $key => $deckName)
           { ?>
              <option value="<?php echo $deckName; ?>">
                <?php echo $deckName; ?>
              </option>
            <?php } ?>
          <option value="custom">Custom</option>
        </select>
        <div>Shared <input id="newDeckIsShared" type="checkbox"></div>
        <div id="addCustomDeckBox">
          <div>Deck name:<input id="deckName" type="text" value="" size="12"></div>
          <div>Paste csv with these columns:</div>
          <div>name,image_url,count</div>
          <div>(case-sensitive, no spaces between fields, any order)</div>
          <textarea type="text" id="deckCSV" value="" rows="10" cols="33"></textarea>
        </div>
        <div><button id="addDeck">Add Deck</button></div>
      </div>

      <div id="deckListBox">
        <div><button id="drawSelectedCard">Draw Selected</button><button id="hideCardList">Hide List</button></div>
        <select id="deckList" size="15"></select>
      </div>
    </div>
  </div>

  <div id="markerBox" class="interfaceSection">
    <div class="interfaceIcon">
      <span class="sectionLabel">Markers</span>
      <span class="sectionHideLabel links">Hide</span>
    </div>

    <div class="interfaceContent">
      <input id="markerText" type="text" size="12" value="+1/+1">
      <button id="createMarker">Create Marker</button>
      <div id="markerHistoryHeader" class="links">Marker History</div>
      <table id="markerHistory"></table>
    </div>
  </div>

  <!-- <div id="settingsHeader" class="links">Other Settings</div> -->

  <div id="settingsBox" class="interfaceSection">
    <div class="interfaceIcon">
      <span class="sectionLabel">Settings</span>
      <span class="sectionHideLabel links">Hide</span>
    </div>

    <div class="interfaceContent">
      <div>
        Table Image:
        <input id="tableImageUrl" type="text" size="12" value="">
        <button id="setTableImageUrl">Set</button>
      </div>

      <div>
        Image Scale:<input id="tableImageScale" type="text" size="1" value="1">
        Distance:<input id="tableDistance" type="text" size="1" value="750">
        <button id="setTableScaleAndDistance">Set</button>
      </div>

      <div>
        Marker Size:
        <input id="markerSize" type="text" size="1" value="5">
        <button id="setMarkerSize">Set</button>
      </div>

      <div>
        Enlarged Card Size:
        <input id="cardSize" type="text" size="1" value="1">
        <button id="setCardSize">Set</button>
      </div>

      <div>
        Deck Deal Point:
        x<input id="deckDealX" type="text" size="1" value="100">
        y<input id="deckDealY" type="text" size="1" value="100">
        <button id="setDeckDealPoint">Set</button>
      </div>
    </div>
  </div>
</div>

<div id="playerActionBox" class="overlayItem actionBox">
  <div id="selectPlayer">Select</div>
  <div id="resetPlayer">Reset</div>
  <div id="renamePlayer">Rename</div>
  <div id="removePlayer">Remove</div>
  <div id="movePlayerUp">Move Up</div>
  <div id="movePlayerDown">Move Down</div>
</div>

<div id="deckActionBox" class="overlayItem actionBox">
  <div id="shuffleDeck">Shuffle</div>
  <div id="listDeck">List</div>
  <div id="returnCardsToDeck">Return Cards</div>
  <div id="removeDeck" class="deleteItem">Remove</div>
  <div id="deckIsShared">Shared<input type="checkbox"></div>
  <div id="deckIsLocked">Locked<input type="checkbox"></div>
  <div id="drawFaceDown">Draw Face Down<input type="checkbox"></div>
</div>

<div id="cardActionBox" class="overlayItem actionBox">
  <div id="playCard" class="hand inPlayFaceDown dealtFaceDown">Play</div>
  <div id="rotateCardLeft" class="inPlay inPlayFaceDown">Rotate Left</div>
  <div id="rotateCardRight" class="inPlay inPlayFaceDown">Rotate Right</div>
  <div id="unrotateAllOwnCards" class="inPlay inPlayFaceDown">Unrotate All</div>
  <div id="playCardFaceDown" class="hand inPlay">Play Facedown</div>
  <div id="moveCardToHand" class="inPlay dealtFaceDown">Put in Hand</div>
  <div id="moveCardToTopOfDeck" class="hand inPlay inPlayFaceDown">Put on Deck Top</div>
  <div id="moveCardToBottomOfDeck" class="hand inPlay inPlayFaceDown">Put on Deck Bottom</div>
</div>

<div id="tableActionBox" class="overlayItem actionBox">
  <div id="createMarkerHere">Create Marker</div>
  <div id="setDeckDealLocation">Set Default Deal Point</div>
  <div id="dealCardHere">Deal To Here</div>
</div>

</body>
</html>
