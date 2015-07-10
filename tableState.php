<?php
session_start();
if (!isset($_SESSION["lastUpdateId"]))
{
    $_SESSION["lastUpdateId"] = -1;
}
session_write_close();
// require_once "../../db_connect/cards.inc";
// require_once "php/room.php";

// $connection = GetDatabaseConnection();
// $updateQuery = $connection->prepare(
//     "UPDATE CurrentState SET
//     zone = ?, xPos = ?, yPos = ?, rotation = ?, ordering = ?
//     WHERE room = ? AND player = ? AND type = ? AND id = ?");
// $updateDeckOrderQuery = $connection->prepare(
//     "UPDATE CurrentState SET
//     ordering = ?
//     WHERE room = ? AND player = ? AND id = ? AND zone = 'deck'");
// $resetDeckQuery = $connection->prepare(
//     "UPDATE CurrentState SET
//     zone = \"deck\", xPos = ?, yPos = ?, rotation = 0, ordering = 0
//     WHERE room = ? AND player = ? AND type = \"card\"");
// $unrotatePlayerCardsQuery = $connection->prepare(
//     "UPDATE CurrentState SET
//     rotation = 0
//     WHERE room = ? AND player = ? AND type = \"card\"");
// $resetMarkersQuery = $connection->prepare(
//     "DELETE FROM CurrentState
//     WHERE room = ? AND player = ? AND type = \"marker\"");
// $removeQuery = $connection->prepare(
//     "DELETE FROM CurrentState
//     WHERE room = ? AND player = ? AND type = ? AND id = ?");
// $removePlayerQuery = $connection->prepare(
//     "DELETE FROM CurrentState
//     WHERE room = ? AND player = ?");
// $removePlayerObjectsQuery = $connection->prepare(
//     "DELETE FROM CurrentState
//     WHERE room = ? AND player = ? AND type != \"player\"");
// $removeRoomQuery = $connection->prepare(
//     "DELETE FROM CurrentState
//     WHERE room = ?");

// for debugging
if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    $_POST = $_GET;
}
// var_dump($_POST);

if (isset($_POST["jsonArguments"]))
{
    $actionArray = json_decode($_POST["jsonArguments"]);
    for ($i=0; $i < count($actionArray); $i++) {
        ProcessRequest($actionArray[$i]);
    }
}
else
{
    ProcessRequest($_POST);
}
function ProcessRequest($args)
{
    require_once "../../db_connect/cards.inc";
    $connection = GetDatabaseConnection();

    if ($args["action"] === "get_state")
    {
        session_start();
        if (isset($args["roomName"]))
        {
            $roomName = $args["roomName"];
        }
        else
        {
            $roomName = $_SESSION["roomName"];
        }

        if (isset($args["lastUpdateId"]))
        {
            $_SESSION["lastUpdateId"] = $args["lastUpdateId"];
        }
        $lastUpdateId = $_SESSION["lastUpdateId"];
        session_write_close();

        $checkForUpdateQuery = $connection->prepare(
            "SELECT id FROM LastRoomUpdate
            WHERE room = ? AND id > ?
            ORDER BY id DESC");
        $checkForUpdateQuery->bind_param("si",
                                         $roomName,
                                         $lastUpdateId);

        $totalTimeSlept = 0;
        $changeDetected = false;
        // wait for new data
        while ($totalTimeSlept < 60)
        {
            $checkForUpdateQuery->execute();
            $checkForUpdateQuery->bind_result($changeId);
            if ($checkForUpdateQuery->fetch())
            {
                $changeDetected = true;
                break;
            }

            $totalTimeSlept += 0.2;
            usleep(200000);

            session_start();
            if ($roomName !== $_SESSION["roomName"])
            {
                $roomName = $_SESSION["roomName"];
                $lastUpdateId = -1;
            }
            session_write_close();
        }

        $checkForUpdateQuery->close();

        if ($changeDetected)
        {
            session_start();
            $_SESSION["lastUpdateId"] = $changeId;
            session_write_close();
            require_once 'php/room.php';
            $roomState = Room::GetFullStateFromRoomName($roomName);
            echo json_encode(array("change_id" => $changeId,
                                   "results" => $roomState));
        }
        else
        {
            echo '{"no_changes":"true"}';
        }
    }
    else
    {
        require_once 'php/room.php';
        require_once 'php/player.php';
        require_once 'php/deck.php';
        require_once 'php/card.php';
        require_once 'php/marker.php';

        // allow for less coupled api calls that don't use session
        if (isset($args["roomId"]))
        {
            $roomId = $args["roomId"];
        }
        elseif (isset($args["roomName"]))
        {
            $roomId = Room::GetRoomId($args["roomName"]);
        }
        else
        {
            session_start();
            $roomId = $_SESSION["roomId"];
            session_write_close();
        }

        if ($args["action"] === "set_room")
        {
            session_start();
            $_SESSION["roomId"] = Room::GetRoomId($args["roomName"], true);
            $_SESSION["roomName"] = $args["roomName"];
            $_SESSION["lastUpdateId"] = -1;
            session_write_close();
        }
        elseif ($args["action"] === "add_player")
        {
            Player::AddPlayer($roomId, $args["playerName"]);
        }
        elseif ($args["action"] === "update_player_name")
        {
            Player::UpdateName($args["playerId"],
                               $args["newName"]);
        }
        elseif ($args["action"] === "add_deck")
        {

            Deck::AddDeck($roomId,
                          $args["deckName"],
                          $args["ownerId"],
                          $args["cardNames"],
                          $args["cardImageUrls"]);
        }
        elseif ($args["action"] === "update_table_image_url")
        {
            Player::UpdateTableImage($args["playerId"],
                                     $args["imageUrl"]);
        }
        elseif ($args["action"] === "update_table_image_scale_and_distance")
        {
            Room::UpdateTableRadius($roomId, $args["imageDistance"]);
            Player::UpdateTableImageScale($args["playerId"],
                                          $args["imageScale"]);
        }
        elseif ($args["action"] === "set_deck_deal_point")
        {
            Player::UpdateDeckDealPoint($args["playerId"],
                                        $args["x"],
                                        $args["y"]);
        }
        elseif ($args["action"] === "update_player_score")
        {
            Player::UpdateScore($args["playerId"],
                                $args["score"]);
        }
        elseif ($args["action"] === "draw_card")
        {
            Card::DrawCard($args["deckId"],
                           $args["playerId"]);
        }
        elseif ($args["action"] === "draw_card_face_down")
        {
            Card::DrawCardFaceDown($args["deckId"],
                                   $args["playerId"]);
        }
        elseif ($args["action"] === "update_card")
        {
            Card::UpdateCard($args["cardId"],
                             $args["zone"],
                             $args["playerId"],
                             $args["x"],
                             $args["y"],
                             $args["ordering"]);
        }
        elseif ($args["action"] === "update_card_zone")
        {
            Card::MoveToZone($args["cardId"],
                             $args["playerId"],
                             $args["zone"],
                             $args["topOrBottom"]);
        }
        elseif ($args["action"] === "update_card_geometry")
        {
            Card::UpdateGeometry($args["id"],
                                 $args["x"],
                                 $args["y"],
                                 $args["rotation"],
                                 $args["ordering"]);
        }
        elseif ($args["action"] === "update_card_rotation")
        {
            Card::UpdateRotation($args["id"],
                                 $args["rotation"]);
        }
        elseif ($args["action"] === "add_marker")
        {
            Marker::AddMarker($args["playerId"],
                              $args["text"],
                              $args["x"],
                              $args["y"],
                              $args["color"]);
        }
        elseif ($args["action"] === "update_marker_geometry")
        {
            Marker::UpdateGeometry($args["id"],
                                   $args["x"],
                                   $args["y"]);
        }
        elseif ($args["action"] === "shuffle_deck")
        {
            Deck::Shuffle($args["deckId"]);
        }
        elseif ($args["action"] === "return_cards_to_deck")
        {
            Deck::ReturnAllCards($args["deckId"]);
        }
        elseif ($args["action"] === "remove_deck")
        {
            Deck::Remove($args["deckId"]);
        }
        elseif ($args["action"] === "update_deck_owner")
        {
            Deck::UpdateOwner($args["deckId"],
                              $args["ownerId"]);
        }
        elseif ($args["action"] === "reset_player")
        {
            Player::Reset($args["playerId"]);
        }
        elseif ($args["action"] === "unrotate_player_cards")
        {
            Card::UnrotatePlayerCards($args["playerId"]);
        }
        elseif ($args["action"] === "update_card_owner")
        {
            Card::UpdateOwner($args["cardId"],
                              $args["newOwnerId"],
                              $args["newX"],
                              $args["newY"]);
        }
        // elseif ($args["action"] === "remove")
        // {
        //     $removeQuery->bind_param("sssi",
        //                              $args["room"],
        //                              $args["playerName"],
        //                              $args["type"],
        //                              $args["id"]);
        //     $removeQuery->execute();
        //     $removeQuery->close();
        // }
        // elseif ($args["action"] === "remove_player_objects")
        // {
        //     $removePlayerObjectsQuery->bind_param("ss",
        //                                    $args["room"],
        //                                    $args["playerName"]);
        //     $removePlayerObjectsQuery->execute();
        //     $removePlayerObjectsQuery->close();
        // }
        elseif ($args["action"] === "remove_player")
        {
            Player::Remove($args["playerId"]);
        }
        else
        {
            echo "unrecognized action: {$args["action"]}";
            $error = true;
        }

        if (!isset($error))
        {
            $markAsUpdatedQuery = $connection->prepare(
                "INSERT INTO LastRoomUpdate
                (room) SELECT ?");
            session_start();
            $markAsUpdatedQuery->bind_param("s", $_SESSION["roomName"]);
            session_write_close();
            $markAsUpdatedQuery->execute();
            $markAsUpdatedQuery->close();
        }
    }

    $connection->close();
}
?>
